<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * One aggregated row per batch (see ShrinkageReportService for the math).
 * Wraps the stdClass rows produced by the service's query-builder aggregation.
 */
class ShrinkageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'batch_id' => $this->batch_id,
            'item_id' => $this->item_id,
            'item_name' => $this->item_name,
            'sku' => $this->sku,
            'lot_number' => $this->lot_number,
            'units_received' => $this->units_received,
            'adjustment_count' => $this->adjustment_count,
            'units_lost' => $this->units_lost,
            'units_found' => $this->units_found,
            'net_variance' => $this->net_variance,
            'variance_pct' => $this->variance_pct,
            'last_adjusted_at' => $this->last_adjusted_at
                ? Carbon::parse($this->last_adjusted_at)->toIso8601String()
                : null,
        ];
    }
}
