<?php

namespace App\Http\Resources;

use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Formatted audit-trail row. For `adjustment` rows the signed quantity IS the
 * recorded-vs-physical variance (physical - recorded) and the row is flagged as
 * a manual override of the recorded stock.
 *
 * @mixin \App\Models\StockTransaction
 */
class TransactionResource extends JsonResource
{
    private const LABELS = [
        'add' => 'Stock received',
        'receipt' => 'Stock received',
        'reservation' => 'Reserved for order',
        'fulfillment' => 'Fulfilled (stock left the warehouse)',
        'cancellation' => 'Reservation released (order cancelled)',
        'adjustment' => 'Manual adjustment (override)',
        'deduct' => 'Manual deduction',
    ];

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $isOverride = $this->type === StockTransaction::TYPE_ADJUSTMENT;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'type_label' => self::LABELS[$this->type] ?? ucfirst($this->type),
            'quantity' => $this->quantity,
            'item' => [
                'id' => $this->batch->item->id,
                'sku' => $this->batch->item->sku,
                'item_name' => $this->batch->item->item_name,
            ],
            'batch' => [
                'id' => $this->batch->id,
                'lot_number' => $this->batch->lot_number,
            ],
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
            'is_override' => $isOverride,
            'variance' => $isOverride ? $this->quantity : null,
            'variance_type' => $isOverride
                ? ($this->quantity < 0 ? 'shortage' : ($this->quantity > 0 ? 'overage' : 'none'))
                : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
