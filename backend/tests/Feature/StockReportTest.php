<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Tests\Support\BuildsReportFixtures;
use Tests\TestCase;

/** GET /api/reports/stock - current stock levels + accurate category (A/B/C) filtering. */
class StockReportTest extends TestCase
{
    use BuildsReportFixtures;
    use DatabaseTransactions;

    private $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->wipeInventory();
        $this->admin = $this->makeUser('Admin');

        // Turnover classes: two A items (3 batches), one B (1 batch), one C (1 batch).
        // Free-text `category` values are deliberately confusing ('B' on an A item,
        // 'A' on a C item) to prove the filter uses turnover_category, not category.
        $this->a1 = $this->makeItem(['item_name' => 'Aircon A1', 'turnover_category' => 'A', 'category' => 'B', 'reorder_point' => 20]);
        $this->a2 = $this->makeItem(['item_name' => 'Fan A2', 'turnover_category' => 'A', 'category' => 'Fans']);
        $this->b1 = $this->makeItem(['item_name' => 'Heater B1', 'turnover_category' => 'B', 'category' => 'Heaters']);
        $this->c1 = $this->makeItem(['item_name' => 'Purifier C1', 'turnover_category' => 'C', 'category' => 'A']);

        $this->makeBatch($this->a1, onHand: 50, reserved: 12, expiry: today()->addDays(60), lot: 'A1-L1');
        $this->makeBatch($this->a1, onHand: 30, reserved: 0, expiry: null, lot: 'A1-L2');
        $this->makeBatch($this->a2, onHand: 8, reserved: 8, expiry: today()->addDays(90), lot: 'A2-L1');
        $this->makeBatch($this->b1, onHand: 20, reserved: 5, expiry: today()->addDays(30), lot: 'B1-L1');
        $this->makeBatch($this->c1, onHand: 100, reserved: 40, expiry: today()->addDays(200), lot: 'C1-L1');
    }

    private function lots(array $response): array
    {
        return array_column($response['data'], 'lot_number');
    }

    public function test_without_a_filter_every_batch_is_listed_with_computed_available_qty(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock')->assertOk()->json();

        $this->assertCount(5, $json['data']);

        $row = collect($json['data'])->firstWhere('lot_number', 'A1-L1');
        $this->assertSame('Aircon A1', $row['item_name']);
        $this->assertSame(50, $row['quantity_on_hand']);
        $this->assertSame(12, $row['reserved_qty']);
        $this->assertSame(38, $row['available_qty'], 'available_qty = on_hand - reserved');
        $this->assertSame(20, $row['reorder_point']);
        $this->assertSame(today()->addDays(60)->toDateString(), $row['expiry_date']);

        $this->assertSame(0, collect($json['data'])->firstWhere('lot_number', 'A2-L1')['available_qty']);
        $this->assertNull(collect($json['data'])->firstWhere('lot_number', 'A1-L2')['expiry_date']);

        // Totals: on_hand 208, reserved 65, available 143
        $this->assertSame(
            ['category' => null, 'batches' => 5, 'total_on_hand' => 208, 'total_reserved' => 65, 'total_available' => 143],
            $json['summary']
        );
    }

    public function test_available_qty_is_computed_not_stored(): void
    {
        $this->assertFalse(Schema::hasColumn('batches', 'available_qty'));
        $this->assertFalse(Schema::hasColumn('items', 'available_qty'));
    }

    public function test_category_a_returns_only_class_a_batches(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=A')->assertOk()->json();

        $this->assertEqualsCanonicalizing(['A1-L1', 'A1-L2', 'A2-L1'], $this->lots($json));
        $this->assertSame(['A'], array_unique(array_column($json['data'], 'turnover_category')));
        $this->assertSame(
            ['category' => 'A', 'batches' => 3, 'total_on_hand' => 88, 'total_reserved' => 20, 'total_available' => 68],
            $json['summary']
        );
    }

    public function test_category_b_and_c_return_exactly_their_own_batches(): void
    {
        $b = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=B')->assertOk()->json();
        $c = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=C')->assertOk()->json();

        $this->assertSame(['B1-L1'], $this->lots($b));
        $this->assertSame(['C1-L1'], $this->lots($c));
        $this->assertSame(15, $b['summary']['total_available']);
        $this->assertSame(60, $c['summary']['total_available']);
    }

    public function test_the_filter_uses_the_turnover_class_not_the_free_text_category_column(): void
    {
        // Purifier C1 has free-text category 'A'; Aircon A1 has free-text category 'B'.
        $a = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=A')->json();
        $this->assertNotContains('C1-L1', $this->lots($a), "free-text category 'A' must not match class A");

        $b = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=B')->json();
        $this->assertNotContains('A1-L1', $this->lots($b), "free-text category 'B' must not match class B");
    }

    public function test_the_filter_is_case_insensitive_and_an_empty_class_returns_no_rows(): void
    {
        $lower = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=b')->assertOk()->json();
        $this->assertSame(['B1-L1'], $this->lots($lower));
        $this->assertSame('B', $lower['summary']['category']);

        $this->wipeInventory();
        $empty = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock?category=A')->assertOk()->json();
        $this->assertSame([], $empty['data']);
        $this->assertSame(0, $empty['summary']['total_available']);
    }

    public function test_an_invalid_category_is_rejected(): void
    {
        foreach (['D', 'AB', 'Appliances', '1'] as $bad) {
            $this->actingAs($this->admin, 'sanctum')
                ->getJson('/api/reports/stock?category='.$bad)
                ->assertStatus(422)
                ->assertJsonValidationErrors(['category']);
        }
    }

    public function test_rows_are_ordered_by_item_name_then_soonest_expiry_with_undated_last(): void
    {
        $json = $this->actingAs($this->admin, 'sanctum')->getJson('/api/reports/stock')->json();

        // Aircon A1 (dated first, undated last), Fan A2, Heater B1, Purifier C1
        $this->assertSame(['A1-L1', 'A1-L2', 'A2-L1', 'B1-L1', 'C1-L1'], $this->lots($json));
    }
}
