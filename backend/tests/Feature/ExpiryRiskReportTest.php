<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Support\BuildsReportFixtures;
use Tests\TestCase;

/** GET /api/reports/expiry-risks - sourced exclusively from `expiry_warning` rows in alerts. */
class ExpiryRiskReportTest extends TestCase
{
    use BuildsReportFixtures;
    use DatabaseTransactions;

    private $admin;

    private $item;

    protected function setUp(): void
    {
        parent::setUp();
        $this->wipeInventory();
        $this->admin = $this->makeUser('Admin');
        $this->item = $this->makeItem(['item_name' => 'Smart Thermostat', 'sku' => 'THERMO-1']);
    }

    private function lots(): array
    {
        return array_column($this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/expiry-risks')->assertOk()->json('data'), 'lot_number');
    }

    public function test_it_lists_flagged_batches_soonest_expiry_first_with_days_until_expiry(): void
    {
        $in10 = $this->makeBatch($this->item, onHand: 12, expiry: today()->addDays(10), lot: 'IN-10');
        $in3 = $this->makeBatch($this->item, onHand: 5, expiry: today()->addDays(3), lot: 'IN-3');
        $in45 = $this->makeBatch($this->item, onHand: 9, expiry: today()->addDays(45), lot: 'IN-45');
        $past = $this->makeBatch($this->item, onHand: 2, expiry: today()->subDays(2), lot: 'PAST');
        foreach ([$in10, $in3, $in45, $past] as $b) {
            $this->makeAlert('expiry_warning', null, $b);
        }

        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/expiry-risks')->assertOk()->json();

        $this->assertSame(['PAST', 'IN-3', 'IN-10', 'IN-45'], array_column($json['data'], 'lot_number'));
        $this->assertSame([-2, 3, 10, 45], array_column($json['data'], 'days_until_expiry'));

        $row = $json['data'][2];
        $this->assertSame('Smart Thermostat', $row['item_name']);
        $this->assertSame('THERMO-1', $row['sku']);
        $this->assertSame(12, $row['quantity_on_hand']);
        $this->assertSame(today()->addDays(10)->toDateString(), $row['expiry_date']);
        $this->assertFalse($row['resolved']);
        $this->assertNotNull($row['alert_id']);
        $this->assertNotNull($row['flagged_at']);
        $this->assertSame(4, $json['summary']['count']);
    }

    public function test_it_is_sourced_from_the_alerts_table_not_computed_from_batch_dates(): void
    {
        // Expires in 5 days but was never flagged -> NOT in the report.
        $this->makeBatch($this->item, expiry: today()->addDays(5), lot: 'UNFLAGGED');
        // Flagged although its expiry is far away -> IS in the report (the alert is the source of truth).
        $flagged = $this->makeBatch($this->item, expiry: today()->addDays(200), lot: 'FLAGGED');
        $this->makeAlert('expiry_warning', null, $flagged);

        $this->assertSame(['FLAGGED'], $this->lots());
    }

    public function test_reorder_alerts_never_appear_in_the_expiry_report(): void
    {
        $batch = $this->makeBatch($this->item, expiry: today()->addDays(20), lot: 'LOT-X');
        $this->makeAlert('reorder_alert', $this->item, null);   // item-level alert, no batch
        $this->makeAlert('reorder_alert', $this->item, $batch); // even if a batch is attached

        $this->assertSame([], $this->lots());
    }

    public function test_resolved_warnings_are_hidden_by_default_and_shown_with_resolved_1(): void
    {
        $open = $this->makeBatch($this->item, expiry: today()->addDays(10), lot: 'OPEN');
        $done = $this->makeBatch($this->item, expiry: today()->addDays(8), lot: 'DONE');
        $this->makeAlert('expiry_warning', null, $open);
        $this->makeAlert('expiry_warning', null, $done, resolved: true);

        $this->assertSame(['OPEN'], $this->lots());

        $resolved = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/expiry-risks?resolved=1')->assertOk()->json();
        $this->assertSame(['DONE'], array_column($resolved['data'], 'lot_number'));
        $this->assertTrue($resolved['data'][0]['resolved']);
        $this->assertTrue($resolved['summary']['resolved']);
    }

    public function test_an_invalid_resolved_flag_is_rejected_and_an_empty_alerts_table_gives_an_empty_report(): void
    {
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/expiry-risks?resolved=maybe')
            ->assertStatus(422)->assertJsonValidationErrors(['resolved']);

        $this->assertSame([], $this->lots());
    }
}
