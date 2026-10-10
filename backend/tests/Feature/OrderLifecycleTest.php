<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Batch;
use App\Models\Item;
use App\Models\Order;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Sprint 3 behaviour in a single process: accessor, FEFO choice, the two-phase
 * reserve -> deduct lifecycle, and error shapes. The true parallel-request
 * proofs live in OrderConcurrencyTest.
 */
class OrderLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::create([
            'name' => 'Staff User',
            'email' => 'staff_life_'.uniqid().'@test.ph',
            'role' => 'Staff',
            'password' => bcrypt('password123'),
        ]);
    }

    // --- Task 1: accessor ------------------------------------------------

    public function test_available_qty_is_computed_and_never_stored(): void
    {
        $this->assertFalse(Schema::hasColumn('batches', 'available_qty'));

        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 50, reserved: 12);

        $this->assertSame(38, $batch->available_qty);

        $batch->reserved_qty = 20;
        $this->assertSame(30, $batch->available_qty, 'Recomputed on the fly, not cached.');

        $this->actingAs($this->staff, 'sanctum')
            ->getJson("/api/items/{$item->id}")
            ->assertOk()
            ->assertJsonPath('data.batches.0.available_qty', 38);
    }

    // --- Task 2: status column -------------------------------------------

    public function test_orders_status_defaults_to_pending_and_rejects_unknown_values(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 5);

        $id = DB::table('orders')->insertGetId([
            'order_date' => now(),
            'user_id' => $this->staff->id,
            'item_id' => $item->id,
            'batch_id' => $batch->id,
            'quantity' => 1,
        ]);
        $this->assertSame('pending', DB::table('orders')->where('id', $id)->value('status'));

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('orders')->where('id', $id)->update(['status' => 'shipped-ish']);
    }

    public function test_status_only_progresses_forward(): void
    {
        $this->assertTrue(OrderStatus::Pending->canTransitionTo(OrderStatus::Confirmed));
        $this->assertTrue(OrderStatus::Confirmed->canTransitionTo(OrderStatus::Fulfilled));
        $this->assertFalse(OrderStatus::Confirmed->canTransitionTo(OrderStatus::Pending));
        $this->assertFalse(OrderStatus::Fulfilled->canTransitionTo(OrderStatus::Pending));
        $this->assertFalse(OrderStatus::Fulfilled->canTransitionTo(OrderStatus::Confirmed));
    }

    // --- Task 3: Trigger 1 - reservation ---------------------------------

    public function test_placing_an_order_reserves_stock_without_touching_quantity_on_hand(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20, expiry: today()->addMonths(3));

        $response = $this->placeOrder($item, 5);

        $response->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('batch_id', $batch->id)
            ->assertJsonPath('quantity', 5);

        $batch->refresh();
        $this->assertSame(20, $batch->quantity_on_hand);
        $this->assertSame(5, $batch->reserved_qty);
        $this->assertSame(15, $batch->available_qty);

        $this->assertDatabaseHas('stock_transactions', [
            'batch_id' => $batch->id, 'user_id' => $this->staff->id, 'type' => 'reservation', 'quantity' => 5,
        ]);
    }

    public function test_reservation_uses_the_batch_that_expires_first(): void
    {
        $item = $this->makeItem();
        $later = $this->makeBatch($item, onHand: 10, expiry: today()->addMonths(9), lot: 'LATER');
        $sooner = $this->makeBatch($item, onHand: 10, expiry: today()->addMonths(2), lot: 'SOONER');
        $undated = $this->makeBatch($item, onHand: 10, expiry: null, lot: 'UNDATED');

        $this->placeOrder($item, 3)->assertCreated()->assertJsonPath('batch_id', $sooner->id);

        $this->assertSame(3, $sooner->refresh()->reserved_qty);
        $this->assertSame(0, $later->refresh()->reserved_qty);
        $this->assertSame(0, $undated->refresh()->reserved_qty);
    }

    public function test_batches_without_an_expiry_date_are_used_last_then_fifo(): void
    {
        $item = $this->makeItem();
        $undatedNewer = $this->makeBatch($item, onHand: 5, expiry: null, lot: 'U-NEW', received: today()->subDays(1));
        $undatedOlder = $this->makeBatch($item, onHand: 5, expiry: null, lot: 'U-OLD', received: today()->subDays(30));
        $dated = $this->makeBatch($item, onHand: 5, expiry: today()->addYear(), lot: 'DATED');

        // Dated stock goes first (and is used up) ...
        $this->placeOrder($item, 5)->assertCreated()->assertJsonPath('batch_id', $dated->id);
        // ... then undated stock, oldest received first (FIFO), not the newer one.
        $this->placeOrder($item, 1)->assertCreated()->assertJsonPath('batch_id', $undatedOlder->id);
        $this->assertSame(0, $undatedNewer->refresh()->reserved_qty);
    }

    public function test_expired_and_fully_reserved_batches_are_skipped(): void
    {
        $item = $this->makeItem();
        $this->makeBatch($item, onHand: 50, expiry: today()->subDay(), lot: 'EXPIRED');
        $this->makeBatch($item, onHand: 10, reserved: 10, expiry: today()->addDays(5), lot: 'FULL');
        $good = $this->makeBatch($item, onHand: 10, expiry: today()->addMonths(4), lot: 'GOOD');

        $this->placeOrder($item, 2)->assertCreated()->assertJsonPath('batch_id', $good->id);
    }

    public function test_order_larger_than_available_is_blocked_with_422_and_nothing_changes(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 10, reserved: 7);

        $this->placeOrder($item, 4)
            ->assertStatus(422)
            ->assertJsonPath('error', 'INSUFFICIENT_STOCK')
            ->assertJsonPath('code', 'INSUFFICIENT_STOCK')
            ->assertJsonPath('available', 3)
            ->assertJsonPath('requested', 4)
            ->assertJsonPath('detail', ['item_id' => $item->id, 'requested' => 4, 'available' => 3]);

        $batch->refresh();
        $this->assertSame(7, $batch->reserved_qty, 'A refused order must not partially reserve.');
        $this->assertSame(0, Order::where('item_id', $item->id)->count());
        $this->assertSame(0, StockTransaction::where('batch_id', $batch->id)->count());
    }

    public function test_ordering_exactly_the_available_amount_succeeds_and_hits_zero_not_below(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 10, reserved: 7);

        $this->placeOrder($item, 3)->assertCreated();
        $this->assertSame(0, $batch->refresh()->available_qty);

        $this->placeOrder($item, 1)->assertStatus(422);
        $this->assertSame(0, $batch->refresh()->available_qty);
    }

    public function test_the_fefo_batch_must_cover_the_whole_order_and_is_never_skipped(): void
    {
        $item = $this->makeItem();
        $soon = $this->makeBatch($item, onHand: 2, expiry: today()->addMonth(), lot: 'SOON');
        $this->makeBatch($item, onHand: 100, expiry: today()->addYear(), lot: 'LATE');

        // 5 units exist overall, but substituting LATE would break FEFO and an
        // order maps to a single batch, so it is refused with the FEFO batch's availability.
        $this->placeOrder($item, 5)->assertStatus(422)->assertJsonPath('available', 2);
        $this->assertSame(0, $soon->refresh()->reserved_qty);
    }

    public function test_order_validation(): void
    {
        $item = $this->makeItem();
        $this->makeBatch($item, onHand: 10);

        $this->placeOrder($item, 0)->assertStatus(422)->assertJsonValidationErrors(['quantity']);
        $this->placeOrder($item, -3)->assertStatus(422)->assertJsonValidationErrors(['quantity']);
        $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/orders', ['item_id' => 999999, 'quantity' => 1])
            ->assertStatus(422)->assertJsonValidationErrors(['item_id']);
    }

    public function test_orders_require_authentication(): void
    {
        $this->postJson('/api/orders', ['item_id' => 1, 'quantity' => 1])->assertStatus(401);
        $this->putJson('/api/orders/1/fulfil')->assertStatus(401);
    }

    // --- Task 4: Trigger 2 - fulfilment ----------------------------------

    public function test_fulfilling_deducts_on_hand_and_reserved_and_logs_a_transaction(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $orderId = $this->placeOrder($item, 6)->json('id');

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/fulfil")
            ->assertOk()
            ->assertJsonPath('status', 'fulfilled');

        $batch->refresh();
        $this->assertSame(14, $batch->quantity_on_hand);
        $this->assertSame(0, $batch->reserved_qty);
        $this->assertSame(14, $batch->available_qty, 'available_qty unchanged by the deduction itself.');

        $this->assertDatabaseHas('stock_transactions', [
            'batch_id' => $batch->id, 'user_id' => $this->staff->id, 'type' => 'fulfillment', 'quantity' => -6,
        ]);
    }

    public function test_reserving_alone_never_removes_physical_stock(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);

        $this->placeOrder($item, 6)->assertCreated();
        $this->placeOrder($item, 4)->assertCreated();

        // Mystery-shrinkage guard: nothing has left the building yet.
        $this->assertSame(20, $batch->refresh()->quantity_on_hand);
        $this->assertSame(10, $batch->reserved_qty);
    }

    public function test_pending_to_confirmed_to_fulfilled_progression(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 10);
        $orderId = $this->placeOrder($item, 2)->json('id');

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/confirm")
            ->assertOk()->assertJsonPath('status', 'confirmed');
        $this->assertSame(10, $batch->refresh()->quantity_on_hand, 'Confirming moves no stock.');

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/fulfil")
            ->assertOk()->assertJsonPath('status', 'fulfilled');
        $this->assertSame(8, $batch->refresh()->quantity_on_hand);

        // And it cannot go backwards.
        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/confirm")
            ->assertStatus(409)->assertJsonPath('error', 'ALREADY_FULFILLED');
    }

    public function test_fulfilling_twice_is_a_409_and_does_not_deduct_twice(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $orderId = $this->placeOrder($item, 6)->json('id');

        $this->actingAs($this->staff, 'sanctum')->putJson("/api/orders/{$orderId}/fulfil")->assertOk();
        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/fulfil")
            ->assertStatus(409)
            ->assertJsonPath('error', 'ALREADY_FULFILLED');

        $this->assertSame(14, $batch->refresh()->quantity_on_hand);
        $this->assertSame(1, StockTransaction::where('batch_id', $batch->id)->where('type', 'fulfillment')->count());
    }

    public function test_fulfilling_a_cancelled_order_is_a_409(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $orderId = $this->placeOrder($item, 6)->json('id');
        Order::whereKey($orderId)->update(['status' => 'cancelled']);

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/fulfil")
            ->assertStatus(409)
            ->assertJsonPath('error', 'ORDER_CANCELLED');

        $this->assertSame(20, $batch->refresh()->quantity_on_hand);
    }

    public function test_fulfilling_an_unknown_order_is_a_404(): void
    {
        $this->actingAs($this->staff, 'sanctum')
            ->putJson('/api/orders/999999/fulfil')
            ->assertStatus(404)
            ->assertJsonPath('error', 'NOT_FOUND');
    }

    public function test_corrupt_stock_is_refused_with_500_instead_of_writing_a_negative(): void
    {
        $item = $this->makeItem();
        $batch = $this->makeBatch($item, onHand: 20);
        $orderId = $this->placeOrder($item, 6)->json('id');

        // Simulate data corruption: something zeroed the reservation behind our back.
        Batch::whereKey($batch->id)->update(['reserved_qty' => 0]);

        $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/orders/{$orderId}/fulfil")
            ->assertStatus(500)
            ->assertJsonPath('error', 'STOCK_INTEGRITY_ERROR');

        $batch->refresh();
        $this->assertSame(20, $batch->quantity_on_hand);
        $this->assertSame(0, $batch->reserved_qty);
        $this->assertSame('pending', Order::find($orderId)->status->value, 'Rolled back - order is still pending.');
    }

    // --- helpers -----------------------------------------------------------

    private function placeOrder(Item $item, int $quantity): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/orders', ['item_id' => $item->id, 'quantity' => $quantity]);
    }

    private function makeItem(): Item
    {
        return Item::create([
            'sku' => 'LIFE-'.uniqid(),
            'item_name' => 'Lifecycle Test Item',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => 0,
        ]);
    }

    private function makeBatch(
        Item $item,
        int $onHand,
        int $reserved = 0,
        $expiry = 'default',
        ?string $lot = null,
        $received = null,
    ): Batch {
        return $item->batches()->create([
            'lot_number' => $lot ?? 'LOT-'.uniqid(),
            'quantity_on_hand' => $onHand,
            'reserved_qty' => $reserved,
            'received_date' => $received ?? today()->subDays(10),
            'expiry_date' => $expiry === 'default' ? today()->addMonths(6) : $expiry,
            'last_updated' => now(),
        ]);
    }
}
