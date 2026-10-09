<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Batch;
use App\Models\Item;
use App\Models\Order;
use App\Models\StockTransaction;
use App\Models\User;
use App\Services\ReorderAlertService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Sprint 3 backend tasks 4-6 (SPRINTS.md): cancel, FR-18 reorder alert, GET /orders.
 */
class OrderCancelListAlertTest extends TestCase
{
    use DatabaseTransactions;

    private User $staff;

    private User $otherStaff;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = $this->makeUser('Staff');
        $this->otherStaff = $this->makeUser('Staff');
        $this->admin = $this->makeUser('Admin');
    }

    // --- Task 4: cancel -----------------------------------------------------

    public function test_cancel_releases_the_reservation_and_logs_a_cancellation(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $orderId = $this->place($this->staff, $item, 6)->json('id');
        $this->assertSame(14, $batch->refresh()->available_qty);

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/cancel")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');

        $batch->refresh();
        $this->assertSame(20, $batch->quantity_on_hand, 'Cancelling never touches physical stock.');
        $this->assertSame(0, $batch->reserved_qty);
        $this->assertSame(20, $batch->available_qty);

        // type is 'cancellation', NOT 'adjustment' (protects the FR-23 shrinkage report)
        $this->assertDatabaseHas('stock_transactions', [
            'batch_id' => $batch->id, 'user_id' => $this->staff->id, 'type' => 'cancellation', 'quantity' => -6,
        ]);
        $this->assertSame(0, StockTransaction::where('batch_id', $batch->id)->where('type', 'adjustment')->count());
    }

    public function test_a_confirmed_order_can_be_cancelled(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 10);
        $orderId = $this->place($this->staff, $item, 2)->json('id');

        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/confirm")->assertOk();
        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/cancel")->assertOk();

        $this->assertSame(0, $batch->refresh()->reserved_qty);
    }

    public function test_a_fulfilled_order_cannot_be_cancelled(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $orderId = $this->place($this->staff, $item, 6)->json('id');
        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/fulfil")->assertOk();

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/cancel")
            ->assertStatus(409)
            ->assertJsonPath('error', 'ALREADY_FULFILLED');

        $batch->refresh();
        $this->assertSame(14, $batch->quantity_on_hand);
        $this->assertSame(0, StockTransaction::where('batch_id', $batch->id)->where('type', 'cancellation')->count());
    }

    public function test_cancelling_twice_releases_only_once(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $first = $this->place($this->staff, $item, 6)->json('id');
        $this->place($this->staff, $item, 4)->assertCreated(); // another live reservation

        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$first}/cancel")->assertOk();
        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$first}/cancel")
            ->assertStatus(409)
            ->assertJsonPath('error', 'ORDER_CANCELLED');

        $this->assertSame(4, $batch->refresh()->reserved_qty, 'Only the first order\'s 6 units were released.');
    }

    public function test_a_cancelled_order_can_no_longer_be_fulfilled_and_stock_is_reusable(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 5);
        $orderId = $this->place($this->staff, $item, 5)->json('id');
        $this->place($this->staff, $item, 1)->assertStatus(422); // fully reserved

        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/cancel")->assertOk();
        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/fulfil")->assertStatus(409)->assertJsonPath('error', 'ORDER_CANCELLED');

        $this->place($this->staff, $item, 5)->assertCreated(); // units are available again
    }

    public function test_cancel_unknown_order_is_404_and_requires_auth(): void
    {
        $this->actingAs($this->staff, 'sanctum')
            ->putJson('/api/orders/999999/cancel')->assertStatus(404)->assertJsonPath('error', 'NOT_FOUND');

        $this->app['auth']->forgetGuards();
        $this->putJson('/api/orders/1/cancel')->assertStatus(401);
    }

    // --- Task 6: GET /api/orders ---------------------------------------------

    public function test_admin_sees_all_orders_and_staff_only_their_own(): void
    {
        $item = $this->makeItem();
        $this->makeBatch($item, onHand: 50);
        $mine = $this->place($this->staff, $item, 1)->json('id');
        $theirs = $this->place($this->otherStaff, $item, 2)->json('id');

        $staffIds = $this->actingAs($this->staff, 'sanctum')->getJson('/api/orders')
            ->assertOk()->json();
        $this->assertSame([$mine], array_column($staffIds, 'id'));

        $adminIds = array_column($this->actingAs($this->admin, 'sanctum')->getJson('/api/orders')
            ->assertOk()->json(), 'id');
        $this->assertContains($mine, $adminIds);
        $this->assertContains($theirs, $adminIds);
    }

    public function test_orders_list_is_a_bare_array_with_the_spec_shape_newest_first(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 50, lot: 'LOT-SHAPE');
        $first = $this->place($this->staff, $item, 1)->json('id');
        $second = $this->place($this->staff, $item, 2)->json('id');

        $rows = $this->actingAs($this->staff, 'sanctum')->getJson('/api/orders')->assertOk()->json();

        $this->assertSame([$second, $first], array_column($rows, 'id'));
        $this->assertSame(
            ['id', 'order_date', 'status', 'user_id', 'item_id', 'batch_id', 'quantity'],
            array_slice(array_keys($rows[0]), 0, 7)
        );
        $this->assertSame('LOT-SHAPE', $rows[0]['batch_lot_number']);
        $this->assertSame($batch->id, $rows[0]['batch_id']);
    }

    public function test_orders_list_can_filter_by_status_and_rejects_unknown_status(): void
    {
        $item = $this->makeItem();
        $this->makeBatch($item, onHand: 50);
        $pending = $this->place($this->staff, $item, 1)->json('id');
        $fulfilled = $this->place($this->staff, $item, 1)->json('id');
        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$fulfilled}/fulfil")->assertOk();

        $ids = array_column($this->actingAs($this->staff, 'sanctum')->getJson('/api/orders?status=pending')->json(), 'id');
        $this->assertSame([$pending], $ids);

        $this->actingAs($this->staff, 'sanctum')->getJson('/api/orders?status=bogus')
            ->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_orders_list_requires_authentication(): void
    {
        $this->getJson('/api/orders')->assertStatus(401);
    }

    // --- Task 5: FR-18 reorder alert -----------------------------------------

    public function test_placing_an_order_that_reaches_the_reorder_point_creates_exactly_one_alert(): void
    {
        $item = $this->makeItem(reorderPoint: 5);
        $this->makeBatch($item, onHand: 10);

        $this->place($this->staff, $item, 4)->assertCreated(); // available 6 > 5
        $this->assertSame(0, $this->openAlerts($item));

        $this->place($this->staff, $item, 1)->assertCreated(); // available 5 <= 5
        $this->assertSame(1, $this->openAlerts($item));

        $this->place($this->staff, $item, 2)->assertCreated(); // still low - no duplicate
        $this->assertSame(1, $this->openAlerts($item));

        $alert = Alert::where('item_id', $item->id)->first();
        $this->assertSame('reorder_alert', $alert->alert_type);
        $this->assertFalse($alert->resolved);
    }

    public function test_a_new_alert_can_fire_again_once_the_previous_one_is_resolved(): void
    {
        $item = $this->makeItem(reorderPoint: 5);
        $this->makeBatch($item, onHand: 10);
        $this->place($this->staff, $item, 6)->assertCreated();
        Alert::where('item_id', $item->id)->update(['resolved' => 1, 'resolved_by' => $this->admin->id, 'resolved_at' => now()]);

        $this->place($this->staff, $item, 1)->assertCreated();

        $this->assertSame(1, $this->openAlerts($item));
        $this->assertSame(2, Alert::where('item_id', $item->id)->count());
    }

    public function test_fulfilling_also_runs_the_reorder_check(): void
    {
        $item = $this->makeItem(reorderPoint: 5);
        $batch = $this->makeBatch($item, onHand: 10);
        $orderId = $this->place($this->staff, $item, 1)->json('id');
        $this->assertSame(0, $this->openAlerts($item));

        // Stock drops behind the scenes (e.g. an adjustment) without an alert yet.
        Batch::whereKey($batch->id)->update(['quantity_on_hand' => 4]);

        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/fulfil")->assertOk();

        $this->assertSame(1, $this->openAlerts($item));
    }

    public function test_expired_batches_do_not_count_towards_available_stock(): void
    {
        $item = $this->makeItem(reorderPoint: 5);
        $this->makeBatch($item, onHand: 100, expiry: today()->subDay(), lot: 'EXPIRED');
        $this->makeBatch($item, onHand: 8, lot: 'LIVE');

        $this->place($this->staff, $item, 4)->assertCreated(); // live available = 4 <= 5

        $this->assertSame(1, $this->openAlerts($item));
    }

    public function test_alerts_are_per_item_and_not_raised_above_the_reorder_point(): void
    {
        $low = $this->makeItem(reorderPoint: 5);
        $healthy = $this->makeItem(reorderPoint: 5);
        $this->makeBatch($low, onHand: 6);
        $this->makeBatch($healthy, onHand: 500);

        $this->place($this->staff, $low, 1)->assertCreated();
        $this->place($this->staff, $healthy, 1)->assertCreated();

        $this->assertSame(1, $this->openAlerts($low));
        $this->assertSame(0, $this->openAlerts($healthy));
    }

    public function test_a_failing_reorder_check_never_breaks_the_order(): void
    {
        $this->mock(ReorderAlertService::class, function ($mock) {
            $mock->shouldReceive('checkItem')->andThrow(new \RuntimeException('alerts table exploded'));
        });

        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 10);

        $orderId = $this->place($this->staff, $item, 3)->assertCreated()->json('id');
        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/fulfil")->assertOk();

        $this->assertSame(7, $batch->refresh()->quantity_on_hand, 'Stock changes stay committed.');
    }

    // --- helpers -------------------------------------------------------------

    private function openAlerts(Item $item): int
    {
        return Alert::where('item_id', $item->id)->where('alert_type', 'reorder_alert')->where('resolved', false)->count();
    }

    private function place(User $user, Item $item, int $qty): TestResponse
    {
        return $this->actingAs($user, 'sanctum')->postJson('/api/orders', ['item_id' => $item->id, 'quantity' => $qty]);
    }

    private function makeUser(string $role): User
    {
        return User::create([
            'name' => "{$role} Tester",
            'email' => strtolower($role).'_'.uniqid().'@test.ph',
            'role' => $role,
            'password' => bcrypt('password123'),
        ]);
    }

    private function makeItem(int $reorderPoint = 0): Item
    {
        return Item::create([
            'sku' => 'CLA-'.uniqid(),
            'item_name' => 'Cancel/List/Alert Test Item',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => $reorderPoint,
        ]);
    }

    private function makeBatch(Item $item, int $onHand, $expiry = 'default', ?string $lot = null): Batch
    {
        return $item->batches()->create([
            'lot_number' => $lot ?? 'LOT-'.uniqid(),
            'quantity_on_hand' => $onHand,
            'reserved_qty' => 0,
            'received_date' => today()->subDays(10),
            'expiry_date' => $expiry === 'default' ? today()->addMonths(6) : $expiry,
            'last_updated' => now(),
        ]);
    }
}
