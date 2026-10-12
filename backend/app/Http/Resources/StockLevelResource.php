<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row per batch. `available_qty` comes from the Batch accessor
 * (quantity_on_hand - reserved_qty); it is computed, never a stored column.
 *
 * @mixin \App\Models\Batch
 */
class StockLevelResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'batch_id' => $this->id,
            'item_id' => $this->item_id,
            'item_name' => $this->item->item_name,
            'sku' => $this->item->sku,
            'category' => $this->item->category,
            'turnover_category' => $this->item->turnover_category,
            'lot_number' => $this->lot_number,
            'quantity_on_hand' => $this->quantity_on_hand,
            'reserved_qty' => $this->reserved_qty,
            'available_qty' => $this->available_qty,
            'reorder_point' => $this->item->reorder_point,
            'received_date' => $this->received_date?->toDateString(),
            'expiry_date' => $this->expiry_date?->toDateString(),
        ];
    }
}
