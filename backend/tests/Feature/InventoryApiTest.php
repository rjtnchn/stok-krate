<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_test_'.uniqid().'@test.ph',
            'role' => 'Admin',
            'password' => bcrypt('password123'),
        ]);

        $this->staff = User::create([
            'name' => 'Staff User',
            'email' => 'staff_test_'.uniqid().'@test.ph',
            'role' => 'Staff',
            'password' => bcrypt('password123'),
        ]);
    }

    public function test_user_can_login_and_receive_sanctum_token(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => $this->admin->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => $this->admin->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/items');
        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_list_items_with_pagination_and_search(): void
    {
        $itemA = Item::create([
            'sku' => 'TEST-AC-'.uniqid(),
            'item_name' => 'Portable Air Conditioner Special',
            'category' => 'Cooling',
            'turnover_category' => 'A',
            'is_seasonal' => true,
            'reorder_point' => 10,
            'current_sf' => 1.20,
        ]);

        $itemB = Item::create([
            'sku' => 'TEST-HT-'.uniqid(),
            'item_name' => 'Ceramic Space Heater Special',
            'category' => 'Heating',
            'turnover_category' => 'B',
            'is_seasonal' => false,
            'reorder_point' => 5,
            'current_sf' => 1.00,
        ]);

        $response = $this->actingAs($this->staff, 'sanctum')
            ->getJson('/api/items?search=Conditioner');

        $response->assertStatus(200)
            ->assertJsonFragment(['sku' => $itemA->sku]);
    }

    public function test_admin_can_create_item(): void
    {
        $sku = 'SM-THERM-'.uniqid();
        $payload = [
            'sku' => $sku,
            'item_name' => 'Smart Thermostat X',
            'category' => 'Smart Devices',
            'turnover_category' => 'A',
            'is_seasonal' => false,
            'reorder_point' => 15,
            'current_sf' => 1.15,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/items', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.sku', $sku);

        $this->assertDatabaseHas('items', ['sku' => $sku]);
    }

    public function test_staff_cannot_create_item(): void
    {
        $payload = [
            'sku' => 'SM-THERM-'.uniqid(),
            'item_name' => 'Smart Thermostat Y',
            'category' => 'Smart Devices',
            'turnover_category' => 'A',
            'is_seasonal' => false,
            'reorder_point' => 15,
            'current_sf' => 1.15,
        ];

        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/items', $payload);

        $response->assertStatus(403);
    }

    public function test_duplicate_sku_is_rejected(): void
    {
        $sku = 'DUP-SKU-'.uniqid();
        Item::create([
            'sku' => $sku,
            'item_name' => 'Existing Item',
            'category' => 'General',
            'turnover_category' => 'C',
            'is_seasonal' => false,
            'reorder_point' => 10,
            'current_sf' => 1.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/items', [
                'sku' => $sku,
                'item_name' => 'Another Item',
                'category' => 'General',
                'turnover_category' => 'C',
                'reorder_point' => 5,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    public function test_user_can_view_item_with_batches(): void
    {
        $sku = 'SHOW-ITEM-'.uniqid();
        $item = Item::create([
            'sku' => $sku,
            'item_name' => 'Item With Batches',
            'category' => 'Testing',
            'turnover_category' => 'B',
            'reorder_point' => 20,
        ]);

        $item->batches()->create([
            'lot_number' => 'LOT-SHOW-01',
            'quantity_on_hand' => 50,
            'reserved_qty' => 5,
            'received_date' => '2026-08-01',
            'last_updated' => now(),
        ]);

        $response = $this->actingAs($this->staff, 'sanctum')
            ->getJson("/api/items/{$item->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.sku', $sku)
            ->assertJsonCount(1, 'data.batches');
    }

    public function test_admin_can_update_item(): void
    {
        $sku = 'UPDATE-ITEM-'.uniqid();
        $item = Item::create([
            'sku' => $sku,
            'item_name' => 'Original Name',
            'category' => 'Testing',
            'turnover_category' => 'B',
            'reorder_point' => 20,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/items/{$item->id}", [
                'item_name' => 'Updated Name',
                'reorder_point' => 30,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.item_name', 'Updated Name')
            ->assertJsonPath('data.reorder_point', 30);
    }

    public function test_cannot_delete_item_with_active_batches_unless_forced(): void
    {
        $sku = 'DEL-ITEM-'.uniqid();
        $item = Item::create([
            'sku' => $sku,
            'item_name' => 'Item to Delete',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => 10,
        ]);

        $item->batches()->create([
            'lot_number' => 'LOT-DEL-01',
            'quantity_on_hand' => 25,
            'reserved_qty' => 0,
            'received_date' => '2026-08-01',
            'last_updated' => now(),
        ]);

        // Attempt deletion without force flag
        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/items/{$item->id}");

        $response->assertStatus(409);
        $this->assertDatabaseHas('items', ['id' => $item->id]);

        // Force delete
        $forceResponse = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/items/{$item->id}?force=1");

        $forceResponse->assertStatus(200);
        $this->assertDatabaseMissing('items', ['id' => $item->id]);
    }

    public function test_creating_batch_records_add_stock_transaction(): void
    {
        $sku = 'BATCH-TEST-'.uniqid();
        $item = Item::create([
            'sku' => $sku,
            'item_name' => 'Batch Test Item',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => 10,
        ]);

        $lotNumber = 'LOT-TEST-'.uniqid();
        $payload = [
            'lot_number' => $lotNumber,
            'quantity_on_hand' => 100,
            'reserved_qty' => 10,
            'received_date' => '2026-09-01',
            'expiry_date' => '2028-09-01',
        ];

        $response = $this->actingAs($this->staff, 'sanctum')
            ->postJson("/api/items/{$item->id}/batches", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.lot_number', $lotNumber)
            ->assertJsonPath('data.quantity_on_hand', 100);

        $batchId = $response->json('data.id');

        // Verify transaction logged
        $this->assertDatabaseHas('stock_transactions', [
            'batch_id' => $batchId,
            'user_id' => $this->staff->id,
            'type' => 'add',
            'quantity' => 100,
        ]);
    }

    public function test_updating_batch_quantity_records_delta_transaction(): void
    {
        $sku = 'BATCH-DELTA-'.uniqid();
        $item = Item::create([
            'sku' => $sku,
            'item_name' => 'Batch Delta Item',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => 10,
        ]);

        $batch = $item->batches()->create([
            'lot_number' => 'LOT-DELTA-'.uniqid(),
            'quantity_on_hand' => 50,
            'reserved_qty' => 0,
            'received_date' => '2026-08-10',
            'last_updated' => now(),
        ]);

        // Increase quantity (+20)
        $incResponse = $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/batches/{$batch->id}", [
                'quantity_on_hand' => 70,
            ]);

        $incResponse->assertStatus(200);

        $this->assertDatabaseHas('stock_transactions', [
            'batch_id' => $batch->id,
            'user_id' => $this->staff->id,
            'type' => 'add',
            'quantity' => 20,
        ]);

        // Decrease quantity (-15)
        $decResponse = $this->actingAs($this->staff, 'sanctum')
            ->putJson("/api/batches/{$batch->id}", [
                'quantity_on_hand' => 55,
            ]);

        $decResponse->assertStatus(200);

        $this->assertDatabaseHas('stock_transactions', [
            'batch_id' => $batch->id,
            'user_id' => $this->staff->id,
            'type' => 'deduct',
            'quantity' => 15,
        ]);
    }

    public function test_batch_show_includes_transactions_and_user_history(): void
    {
        $sku = 'BATCH-HIST-'.uniqid();
        $item = Item::create([
            'sku' => $sku,
            'item_name' => 'Batch History Item',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => 10,
        ]);

        $batch = $item->batches()->create([
            'lot_number' => 'LOT-HIST-'.uniqid(),
            'quantity_on_hand' => 60,
            'reserved_qty' => 5,
            'received_date' => '2026-08-01',
            'last_updated' => now(),
        ]);

        StockTransaction::recordTransaction($batch->id, $this->staff->id, 'add', 60);

        $response = $this->actingAs($this->staff, 'sanctum')
            ->getJson("/api/batches/{$batch->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.lot_number', $batch->lot_number)
            ->assertJsonCount(1, 'data.transactions')
            ->assertJsonPath('data.transactions.0.user.id', $this->staff->id);
    }
}
