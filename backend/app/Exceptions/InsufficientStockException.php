<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Thrown when a reservation would push a batch's available_qty below zero.
 * Rendered as 422 INSUFFICIENT_STOCK (SPEC.md, POST /api/orders).
 */
class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly int $itemId,
        public readonly int $requested,
        public readonly int $available,
    ) {
        parent::__construct(
            "Not enough stock available (available: {$available}, requested: {$requested})."
        );
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'INSUFFICIENT_STOCK',
            // `code`, `available` and `requested` are read at the top level by
            // the frontend's PlaceOrderForm; `detail` is the shape in SPEC.md.
            'code' => 'INSUFFICIENT_STOCK',
            'message' => $this->getMessage(),
            'available' => $this->available,
            'requested' => $this->requested,
            'detail' => [
                'item_id' => $this->itemId,
                'requested' => $this->requested,
                'available' => $this->available,
            ],
        ], 422);
    }
}
