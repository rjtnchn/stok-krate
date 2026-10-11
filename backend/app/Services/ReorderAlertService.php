<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Batch;
use App\Models\Item;
use Illuminate\Support\Facades\DB;

/**
 * FR-18 - inline reorder check.
 *
 * When an item's total available_qty (across non-expired batches) is at or
 * below its reorder_point, and no unresolved reorder_alert already exists for
 * it, create exactly one.
 *
 * Called by OrderService AFTER the place / fulfil transaction has committed
 * (SPRINTS.md Sprint 3, backend task 5).
 */
class ReorderAlertService
{
    public function checkItem(int $itemId): void
    {
        DB::transaction(function () use ($itemId): void {
            // Lock the item row so two concurrent checks for the same item are
            // serialised: the second one will see the first one's alert and skip,
            // instead of both passing the "no unresolved alert" test and
            // inserting a duplicate (SPEC: "do not create duplicate alerts").
            $item = Item::query()->whereKey($itemId)->lockForUpdate()->first();

            if ($item === null) {
                return;
            }

            // Expired batches cannot be sold, so they do not count as available.
            $available = (int) Batch::query()
                ->where('item_id', $itemId)
                ->where(function ($query) {
                    $query->whereNull('expiry_date')
                        ->orWhereDate('expiry_date', '>=', today());
                })
                ->sum(DB::raw('quantity_on_hand - reserved_qty'));

            if ($available > (int) $item->reorder_point) {
                return;
            }

            $alreadyOpen = Alert::query()
                ->where('item_id', $itemId)
                ->where('alert_type', Alert::TYPE_REORDER)
                ->where('resolved', false)
                ->exists();

            if ($alreadyOpen) {
                return;
            }

            Alert::create([
                'item_id' => $itemId,
                'alert_type' => Alert::TYPE_REORDER,
                'resolved' => false,
            ]);
        });
    }
}
