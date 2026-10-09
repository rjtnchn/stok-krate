<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Thrown when a deduction would make quantity_on_hand or reserved_qty negative.
 * That should be structurally impossible; if it happens we log it loudly and
 * refuse to write a negative number (SPEC.md, "Stock Deduction").
 */
class StockIntegrityException extends RuntimeException
{
    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'STOCK_INTEGRITY_ERROR',
            'code' => 'STOCK_INTEGRITY_ERROR',
            'message' => 'Stock records are inconsistent for this order. No changes were made.',
        ], 500);
    }
}
