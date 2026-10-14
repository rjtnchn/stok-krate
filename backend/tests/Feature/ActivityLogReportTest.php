<?php

namespace Tests\Feature;

use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Support\BuildsReportFixtures;
use Tests\TestCase;

/**
 * GET /api/reports/activity-log - audit trail from stock_transactions.
 *
 * Fixture (t1..t7, oldest to newest):
 *   t1 X add          +10  staff  Sep 1     t5 Z adjustment  +2  admin  Sep 5
 *   t2 X reservation   +2  staff  Sep 2     t6 Z adjustment  -2  admin  Sep 6
 *   t3 X adjustment    -5  admin  Sep 3     t7 X cancellation -2 staff  Sep 7
 *   t4 Y adjustment    +6  staff  Sep 4
 */
class ActivityLogReportTest extends TestCase
{
    use BuildsReportFixtures;
    use DatabaseTransactions;

    private $admin;

    private $staff;

    private $item1;

    private $item2;

    private $x;

    private $y;

    private $z;

    private $w;

    /** @var array<string, \App\Models\StockTransaction> */
    private array $t = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->wipeInventory();
        $this->admin = $this->makeUser('Admin', ['name' => 'Ada Admin']);
        $this->staff = $this->makeUser('Staff', ['name' => 'Sam Staff']);

        $this->item1 = $this->makeItem(['item_name' => 'Portable AC', 'sku' => 'PAC-1']);
        $this->item2 = $this->makeItem(['item_name' => 'Air Purifier', 'sku' => 'APF-1']);
        $this->x = $this->makeBatch($this->item1, onHand: 10, lot: 'X');
        $this->y = $this->makeBatch($this->item1, onHand: 10, lot: 'Y');
        $this->z = $this->makeBatch($this->item2, onHand: 5, lot: 'Z');
        $this->w = $this->makeBatch($this->item2, onHand: 7, lot: 'W');

        $this->t['t1'] = $this->logTx($this->x, $this->staff, 'add', 10, '2026-09-01 08:00:00');
        $this->t['t2'] = $this->logTx($this->x, $this->staff, 'reservation', 2, '2026-09-02 08:00:00');
        $this->t['t3'] = $this->logTx($this->x, $this->admin, 'adjustment', -5, '2026-09-03 08:00:00');
        $this->t['t4'] = $this->logTx($this->y, $this->staff, 'adjustment', 6, '2026-09-04 08:00:00');
        $this->t['t5'] = $this->logTx($this->z, $this->admin, 'adjustment', 2, '2026-09-05 08:00:00');
        $this->t['t6'] = $this->logTx($this->z, $this->admin, 'adjustment', -2, '2026-09-06 08:00:00');
        $this->t['t7'] = $this->logTx($this->x, $this->staff, 'cancellation', -2, '2026-09-07 08:00:00');
    }

    private function fetch(string $query = ''): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/activity-log'.$query);
    }

    /** @param  list<string>  $names */
    private function ids(array $names): array
    {
        return array_map(fn ($n) => $this->t[$n]->id, $names);
    }

    // --- trail -------------------------------------------------------------

    public function test_the_trail_is_newest_first_by_default_and_oldest_first_on_request(): void
    {
        $this->assertSame($this->ids(['t7', 't6', 't5', 't4', 't3', 't2', 't1']), array_column($this->fetch()->assertOk()->json('data'), 'id'));
        $this->assertSame($this->ids(['t1', 't2', 't3', 't4', 't5', 't6', 't7']), array_column($this->fetch('?order=asc')->json('data'), 'id'));
    }

    public function test_rows_are_formatted_with_item_batch_user_and_variance(): void
    {
        $rows = collect($this->fetch()->json('data'))->keyBy('id');

        $shortage = $rows[$this->t['t3']->id];
        $this->assertSame('adjustment', $shortage['type']);
        $this->assertSame('Manual adjustment (override)', $shortage['type_label']);
        $this->assertSame(-5, $shortage['quantity']);
        $this->assertTrue($shortage['is_override']);
        $this->assertSame(-5, $shortage['variance']);
        $this->assertSame('shortage', $shortage['variance_type']);
        $this->assertSame(['id' => $this->item1->id, 'sku' => 'PAC-1', 'item_name' => 'Portable AC'], $shortage['item']);
        $this->assertSame(['id' => $this->x->id, 'lot_number' => 'X'], $shortage['batch']);
        $this->assertSame(['id' => $this->admin->id, 'name' => 'Ada Admin'], $shortage['user']);
        $this->assertTrue(Carbon::parse($shortage['created_at'])->equalTo(Carbon::parse('2026-09-03 08:00:00')));

        $this->assertSame('overage', $rows[$this->t['t4']->id]['variance_type']);

        $reservation = $rows[$this->t['t2']->id];
        $this->assertFalse($reservation['is_override']);
        $this->assertNull($reservation['variance']);
        $this->assertNull($reservation['variance_type']);
        $this->assertSame('Reserved for order', $reservation['type_label']);
        $this->assertSame('Reservation released (order cancelled)', $rows[$this->t['t7']->id]['type_label']);
        $this->assertSame('Stock received', $rows[$this->t['t1']->id]['type_label']);
    }

    // --- filters ---------------------------------------------------------------

    public function test_filters_narrow_the_trail_accurately(): void
    {
        $ids = fn (string $q) => array_column($this->fetch($q)->assertOk()->json('data'), 'id');

        $this->assertEqualsCanonicalizing($this->ids(['t3', 't4', 't5', 't6']), $ids('?type=adjustment'));
        $this->assertEqualsCanonicalizing($this->ids(['t1', 't2', 't4', 't7']), $ids('?user_id='.$this->staff->id));
        $this->assertEqualsCanonicalizing($this->ids(['t5', 't6']), $ids('?item_id='.$this->item2->id));
        $this->assertEqualsCanonicalizing($this->ids(['t1', 't2', 't3', 't7']), $ids('?batch_id='.$this->x->id));
        $this->assertEqualsCanonicalizing($this->ids(['t3', 't4']), $ids('?from=2026-09-03&to=2026-09-04'));
        $this->assertSame($this->ids(['t6']), $ids('?type=adjustment&user_id='.$this->admin->id.'&from=2026-09-06'));
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $this->fetch('?type=bogus')->assertStatus(422)->assertJsonValidationErrors(['type']);
        $this->fetch('?per_page=500')->assertStatus(422)->assertJsonValidationErrors(['per_page']);
        $this->fetch('?user_id=999999')->assertStatus(422)->assertJsonValidationErrors(['user_id']);
        $this->fetch('?order=sideways')->assertStatus(422)->assertJsonValidationErrors(['order']);
        $this->fetch('?from=2026-09-10&to=2026-09-01')->assertStatus(422)->assertJsonValidationErrors(['to']);
    }

    public function test_the_trail_is_paginated(): void
    {
        $first = $this->fetch('?per_page=3')->assertOk()->json();
        $this->assertCount(3, $first['data']);
        $this->assertSame(7, $first['meta']['total']);
        $this->assertSame(3, $first['meta']['per_page']);
        $this->assertSame(3, $first['meta']['last_page']);
        $this->assertStringContainsString('per_page=3', $first['links']['next']);

        $last = $this->fetch('?per_page=3&page=3')->json();
        $this->assertSame($this->ids(['t1']), array_column($last['data'], 'id'));
    }

    // --- audit summary ---------------------------------------------------------

    public function test_recorded_vs_physical_totals_and_open_discrepancies(): void
    {
        $summary = $this->fetch()->json('summary');

        // adjustments: -5 (X), +6 (Y), +2 and -2 (Z)
        $this->assertSame(
            ['adjustment_count' => 4, 'units_lost' => 7, 'units_found' => 8, 'net_variance' => 1],
            $summary['recorded_vs_physical']
        );
        // X nets -5 (open), Y nets +6 (open), Z nets 0 (closed by the opposite correction)
        $this->assertSame(2, $summary['open_discrepancies']);
    }

    public function test_overrides_are_counted_overall_and_per_user(): void
    {
        $overrides = $this->fetch()->json('summary.overrides');

        $this->assertSame(4, $overrides['count']);
        $this->assertSame([
            ['user_id' => $this->admin->id, 'user_name' => 'Ada Admin', 'count' => 3, 'net_variance' => -5], // -5 +2 -2
            ['user_id' => $this->staff->id, 'user_name' => 'Sam Staff', 'count' => 1, 'net_variance' => 6],
        ], $overrides['by_user']);
    }

    public function test_last_full_audit_needs_every_stocked_batch_to_have_been_recounted(): void
    {
        // W still holds stock (7) and was never adjusted -> there has been no full audit.
        $this->assertNull($this->fetch()->json('summary.last_full_audit'));
        $this->assertTrue(Carbon::parse($this->fetch()->json('summary.last_adjustment_at'))->equalTo(Carbon::parse('2026-09-06 08:00:00')));

        // An empty, never-adjusted batch does not block a full audit...
        $this->makeBatch($this->item2, onHand: 0, lot: 'EMPTY');
        $this->assertNull($this->fetch()->json('summary.last_full_audit'));

        // ...but once W is recounted, every stocked batch has been audited. The audit
        // date is the OLDEST of the batches' latest recounts: X Sep 3, Y Sep 4, Z Sep 6, W Sep 10.
        $this->logTx($this->w, $this->admin, 'adjustment', 0, '2026-09-10 08:00:00');
        $audit = $this->fetch()->json('summary');

        $this->assertTrue(Carbon::parse($audit['last_full_audit'])->equalTo(Carbon::parse('2026-09-03 08:00:00')));
        $this->assertTrue(Carbon::parse($audit['last_adjustment_at'])->equalTo(Carbon::parse('2026-09-10 08:00:00')));
    }

    public function test_the_summary_is_system_wide_and_ignores_filters_and_pagination(): void
    {
        $plain = $this->fetch()->json('summary');

        $this->assertSame($plain, $this->fetch('?type=cancellation')->json('summary'));
        $this->assertSame($plain, $this->fetch('?per_page=1&page=2')->json('summary'));
    }

    public function test_an_empty_system_has_a_zeroed_summary(): void
    {
        $this->wipeInventory();
        $json = $this->fetch()->assertOk()->json();

        $this->assertSame([], $json['data']);
        $this->assertSame(0, $json['summary']['open_discrepancies']);
        $this->assertNull($json['summary']['last_full_audit']);
        $this->assertNull($json['summary']['last_adjustment_at']);
        $this->assertSame(['count' => 0, 'by_user' => []], $json['summary']['overrides']);
        $this->assertSame(
            ['adjustment_count' => 0, 'units_lost' => 0, 'units_found' => 0, 'net_variance' => 0],
            $json['summary']['recorded_vs_physical']
        );
    }
}
