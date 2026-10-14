<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An `expiry_warning` row from the alerts table, joined to its batch and item.
 *
 * @mixin \App\Models\Alert
 */
class ExpiryRiskResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $batch = $this->batch;
        $expiry = $batch->expiry_date;

        return [
            'alert_id' => $this->id,
            'batch_id' => $batch->id,
            'item_id' => $batch->item->id,
            'item_name' => $batch->item->item_name,
            'sku' => $batch->item->sku,
            'lot_number' => $batch->lot_number,
            'quantity_on_hand' => $batch->quantity_on_hand,
            'expiry_date' => $expiry?->toDateString(),
            // whole days from today to expiry; negative once the batch has expired
            'days_until_expiry' => $expiry ? (int) today()->diffInDays($expiry, false) : null,
            'flagged_at' => $this->created_at?->toIso8601String(),
            'resolved' => (bool) $this->resolved,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
        ];
    }
}
