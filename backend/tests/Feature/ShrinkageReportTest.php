<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Support\BuildsReportFixtures;
use Tests\TestCase;

/**
 * GET /api/reports/shrinkage - recorded-vs-physical variance aggregated from
 * `adjustment` rows in stock_transactions.
 *
 * Fixture (all numbers are hand-computed in the assertions):
 *
 *   Item ALPHA   batch B1   received: add 100 + receipt 50 = 150
 *                          adjustments: -10 (Sep 1), -5 (Sep 15), +3 (Oct 1)
 *                          noise: cancellation -4, reservation +6, fulfillment -3, deduct +9
 *                batch B2   received: add 40;  adjustments: +4 (Oct 5)
 *   Item BETA    batch B3   received: none;    adjustments: -7 (Aug 1)
 *                batch B4   cancellation -20 ONLY  -> must never appear
 */
class ShrinkageReportTest extends TestCase
{
    use BuildsReportFixtures;
    use DatabaseTransactions;

    private $admin;

    private $b1;

    private $b2;

    private $b3;

    private $b4;

    protected function setUp(): void
    {
        parent::setUp();
        $this->wipeInventory();
        $this->admin = $this->makeUser('Admin');
        $staff = $this->makeUser('Staff');

        $alpha = $this->makeItem(['item_name' => 'ALPHA Aircon', 'sku' => 'ALPHA-1']);
        $beta = $this->makeItem(['item_name' => 'BETA Heater', 'sku' => 'BETA-1']);
        $this->b1 = $this->makeBatch($alpha, lot: 'B1');
        $this->b2 = $this->makeBatch($alpha, lot: 'B2');
        $this->b3 = $this->makeBatch($beta, lot: 'B3');
        $this->b4 = $this->makeBatch($beta, lot: 'B4');

        // receipts (the "recorded" baseline)
        $this->logTx($this->b1, $staff, 'add', 100, '2026-07-01 09:00:00');
        $this->logTx($this->b1, $staff, 'receipt', 50, '2026-07-02 09:00:00');
        $this->logTx($this->b2, $staff, 'add', 40, '2026-07-03 09:00:00');

        // adjustments (physical - recorded)
        $this->logTx($this->b1, $this->admin, 'adjustment', -10, '2026-09-01 10:00:00');
        $this->logTx($this->b1, $this->admin, 'adjustment', -5, '2026-09-15 10:00:00');
        $this->logTx($this->b1, $staff, 'adjustment', 3, '2026-10-01 10:00:00');
        $this->logTx($this->b2, $this->admin, 'adjustment', 4, '2026-10-05 10:00:00');
        $this->logTx($this->b3, $staff, 'adjustment', -7, '2026-08-01 10:00:00');

        // noise that MUST NOT affect the variance
        $this->logTx($this->b1, $staff, 'cancellation', -4, '2026-09-02 10:00:00');
        $this->logTx($this->b1, $staff, 'reservation', 6, '2026-09-03 10:00:00');
        $this->logTx($this->b1, $staff, 'fulfillment', -3, '2026-09-04 10:00:00');
        $this->logTx($this->b1, $staff, 'deduct', 9, '2026-09-05 10:00:00');
        $this->logTx($this->b4, $staff, 'cancellation', -20, '2026-09-06 10:00:00');
    }

    private function rowFor(array $json, string $lot): array
    {
        return collect($json['data'])->firstWhere('lot_number', $lot);
    }

    public function test_variance_is_aggregated_exactly_from_adjustment_rows(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/shrinkage')->assertOk()->json();

        $b1 = $this->rowFor($json, 'B1');
        $this->assertSame(3, $b1['adjustment_count']);
        $this->assertSame(15, $b1['units_lost'], '10 + 5');
        $this->assertSame(3, $b1['units_found']);
        $this->assertSame(-12, $b1['net_variance'], '-10 - 5 + 3');
        $this->assertSame(150, $b1['units_received'], 'add 100 + receipt 50');
        $this->assertEquals(-8, $b1['variance_pct'], '-12 / 150 * 100'); // JSON drops the trailing .0
        $this->assertSame('ALPHA Aircon', $b1['item_name']);
        $this->assertSame('ALPHA-1', $b1['sku']);

        $b2 = $this->rowFor($json, 'B2');
        $this->assertSame([1, 0, 4, 4, 40], [
            $b2['adjustment_count'], $b2['units_lost'], $b2['units_found'], $b2['net_variance'], $b2['units_received'],
        ]);
        $this->assertEquals(10, $b2['variance_pct'], '4 / 40 * 100');

        $b3 = $this->rowFor($json, 'B3');
        $this->assertSame([1, 7, 0, -7, 0], [
            $b3['adjustment_count'], $b3['units_lost'], $b3['units_found'], $b3['net_variance'], $b3['units_received'],
        ]);
        $this->assertNull($b3['variance_pct'], 'no recorded receipts -> percentage is undefined, not a divide-by-zero');
    }

    public function test_summary_totals_add_up(): void
    {
        $summary = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/shrinkage')->json('summary');

        $this->assertSame([
            'batches_affected' => 3,
            'items_affected' => 2,
            'adjustment_count' => 5,
            'units_lost' => 22,   // 15 + 0 + 7
            'units_found' => 7,   // 3 + 4 + 0
            'net_variance' => -15, // -12 + 4 - 7
        ], $summary);
        $this->assertSame($summary['units_found'] - $summary['units_lost'], $summary['net_variance']);
    }

    public function test_only_adjustment_rows_count_cancellations_and_other_types_are_excluded(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/shrinkage')->json();

        $lots = array_column($json['data'], 'lot_number');
        $this->assertNotContains('B4', $lots, 'a batch with only a cancellation must not appear');
        $this->assertCount(3, $lots);

        // The reservation/fulfillment/cancellation/deduct noise on B1 changed nothing.
        $this->assertSame(-12, $this->rowFor($json, 'B1')['net_variance']);
    }

    public function test_largest_shortage_is_listed_first(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/shrinkage')->json();

        $this->assertSame(['B1', 'B3', 'B2'], array_column($json['data'], 'lot_number')); // -12, -7, +4
    }

    public function test_date_range_filters_adjustments_but_not_the_received_baseline(): void
    {
        // Only B1's -5 (Sep 15) falls in September 10-30.
        $json = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/shrinkage?from=2026-09-10&to=2026-09-30')->assertOk()->json();

        $this->assertCount(1, $json['data']);
        $row = $json['data'][0];
        $this->assertSame('B1', $row['lot_number']);
        $this->assertSame([1, 5, 0, -5], [$row['adjustment_count'], $row['units_lost'], $row['units_found'], $row['net_variance']]);
        $this->assertSame(150, $row['units_received'], 'the recorded baseline is all-time');
        $this->assertSame(-3.33, $row['variance_pct']);
        $this->assertSame(1, $json['summary']['adjustment_count']);
        $this->assertSame(-5, $json['summary']['net_variance']);
    }

    public function test_the_to_date_is_inclusive_of_the_whole_day(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/reports/shrinkage?from=2026-10-01&to=2026-10-01')->json();

        $this->assertSame(['B1'], array_column($json['data'], 'lot_number')); // the +3 logged at 10:00 on Oct 1
        $this->assertSame(3, $json['data'][0]['net_variance']);
    }

    public function test_invalid_date_ranges_are_rejected(): void
    {
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/shrinkage?from=not-a-date')
            ->assertStatus(422)->assertJsonValidationErrors(['from']);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/shrinkage?from=2026-10-10&to=2026-10-01')
            ->assertStatus(422)->assertJsonValidationErrors(['to']);
    }

    public function test_no_adjustments_gives_an_empty_report_with_zero_totals(): void
    {
        $this->actingAs($this->admin, 'sanctum');
        \Illuminate\Support\Facades\DB::table('stock_transactions')->where('type', 'adjustment')->delete();

        $json = $this->getJson('/api/reports/shrinkage')->assertOk()->json();

        $this->assertSame([], $json['data']);
        $this->assertSame(
            ['batches_affected' => 0, 'items_affected' => 0, 'adjustment_count' => 0, 'units_lost' => 0, 'units_found' => 0, 'net_variance' => 0],
            $json['summary']
        );
    }
}
