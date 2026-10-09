<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * SPEC.md order shape: { id, order_date, status, user_id, item_id, batch_id, quantity }
 * plus the lot number / item name when those relations are loaded, which the
 * frontend shows in the "assigned to lot ..." confirmation.
 *
 * @mixin \App\Models\Order
 */
class OrderResource extends JsonResource
{
    /** SPEC.md returns the bare object, not { data: ... }. */
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_date' => $this->order_date?->toIso8601String(),
            'status' => $this->status->value,
            'user_id' => $this->user_id,
            'item_id' => $this->item_id,
            'batch_id' => $this->batch_id,
            'quantity' => $this->quantity,
            'batch_lot_number' => $this->whenLoaded('batch', fn () => $this->batch->lot_number),
            'item_name' => $this->whenLoaded('item', fn () => $this->item->item_name),
        ];
    }
}
