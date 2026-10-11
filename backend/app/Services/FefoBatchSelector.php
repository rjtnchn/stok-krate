<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Batch;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * The single place FEFO (First-Expired-First-Out) logic lives.
 *
 * Eligible batches are those with stock left to promise (available_qty > 0)
 * that have not already expired. They are ordered by soonest expiry_date;
 * batches with no expiry_date (non-perishable) sort last, and ties fall back to
 * received_date (FIFO) so FEFO degrades gracefully to FIFO.
 *
 * MUST be called inside DB::transaction(): the rows are fetched with
 * lockForUpdate() and the lock is only held until that transaction ends.
 */
class FefoBatchSelector
{
    /**
     * Pick - and row-lock - the batch an order of $quantity must be reserved from.
     *
     * An order maps to exactly one batch (orders.batch_id; there is no
     * order_items table), so the FEFO batch has to cover the whole quantity on
     * its own. We never split an order across batches and never skip past the
     * FEFO batch to a later-expiring one that happens to fit - either would
     * break FEFO.
     *
     * @throws InsufficientStockException when the FEFO batch cannot cover $quantity
     */
    public function select(int $itemId, int $quantity): Batch
    {
        if (DB::transactionLevel() < 1) {
            throw new LogicException('FefoBatchSelector::select() must run inside DB::transaction().');
        }

        $eligible = Batch::query()
            ->where('item_id', $itemId)
            ->where(function ($query) {
                // An expired batch counts as 0 available (SPEC.md, FEFO edge cases).
                $query->whereNull('expiry_date')
                    ->orWhereDate('expiry_date', '>=', today());
            })
            ->whereRaw('(quantity_on_hand - reserved_qty) > 0')
            // MySQL has no NULLS LAST: (expiry_date IS NULL) is 0 for dated
            // batches and 1 for undated ones, pushing non-perishables to the end.
            ->orderByRaw('(expiry_date IS NULL)')
            ->orderBy('expiry_date', 'asc')
            ->orderBy('received_date', 'asc')
            ->orderBy('id', 'asc') // stable tie-break => every transaction locks rows in the same order
            ->lockForUpdate()
            ->get();

        $fefoBatch = $eligible->first();

        // available_qty is read AFTER the lock, so it reflects every order that
        // committed before us and is not a stale snapshot.
        if ($fefoBatch === null || $fefoBatch->available_qty < $quantity) {
            throw new InsufficientStockException(
                itemId: $itemId,
                requested: $quantity,
                available: $fefoBatch?->available_qty ?? 0,
            );
        }

        return $fefoBatch;
    }
}
