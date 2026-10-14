<?php

namespace Tests\Support;

use App\Models\Alert;
use App\Models\Batch;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Shared fixtures for the Sprint 5 report / admin tests.
 *
 * Tests using this trait must also use DatabaseTransactions: wipeInventory()
 * deletes seeded inventory rows so report totals can be asserted exactly, and the
 * surrounding transaction rolls every change back after each test.
 */
trait BuildsReportFixtures
{
    /** Remove seeded inventory/audit rows (rolled back by DatabaseTransactions). */
    protected function wipeInventory(): void
    {
        DB::table('alerts')->delete();
        DB::table('stock_transactions')->delete();
        DB::table('orders')->delete();
        DB::table('batches')->delete();
    }

    protected function makeUser(string $role = 'Staff', array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => "{$role} ".uniqid(),
            'email' => strtolower($role).'_'.uniqid().'@test.ph',
            'role' => $role,
            'password' => bcrypt('password123'),
        ], $overrides));
    }

    protected function makeItem(array $attrs = []): Item
    {
        return Item::create(array_merge([
            'sku' => 'S5-'.strtoupper(uniqid()),
            'item_name' => 'Item '.uniqid(),
            'category' => 'Appliances',
            'turnover_category' => 'A',
            'reorder_point' => 0,
        ], $attrs));
    }

    /** @param  \DateTimeInterface|string|null  $expiry  'default' = +6 months, null = no expiry */
    protected function makeBatch(Item $item, int $onHand = 10, int $reserved = 0, $expiry = 'default', ?string $lot = null, $received = null): Batch
    {
        return $item->batches()->create([
            'lot_number' => $lot ?? 'LOT-'.strtoupper(uniqid()),
            'quantity_on_hand' => $onHand,
            'reserved_qty' => $reserved,
            'received_date' => $received ?? today()->subDays(10),
            'expiry_date' => $expiry === 'default' ? today()->addMonths(6) : $expiry,
            'last_updated' => now(),
        ]);
    }

    /** @param  \DateTimeInterface|string|null  $at */
    protected function logTx(Batch $batch, User $user, string $type, int $quantity, $at = null): StockTransaction
    {
        $tx = new StockTransaction([
            'batch_id' => $batch->id,
            'user_id' => $user->id,
            'type' => $type,
            'quantity' => $quantity,
        ]);
        if ($at !== null) {
            $tx->created_at = $at;
        }
        $tx->save();

        return $tx;
    }

    /** @param  \DateTimeInterface|string|null  $at */
    protected function makeAlert(string $type, ?Item $item, ?Batch $batch, bool $resolved = false, $at = null): Alert
    {
        $alert = new Alert([
            'item_id' => $item?->id ?? $batch?->item_id,
            'batch_id' => $batch?->id,
            'alert_type' => $type,
            'resolved' => $resolved,
        ]);
        if ($at !== null) {
            $alert->created_at = $at;
        }
        $alert->save();

        return $alert;
    }
}
