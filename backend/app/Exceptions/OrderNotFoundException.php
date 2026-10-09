<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** Rendered as 404 NOT_FOUND (SPEC.md, PUT /api/orders/{id}/fulfil). */
class OrderNotFoundException extends RuntimeException
{
    public function __construct(int $orderId)
    {
        parent::__construct("Order {$orderId} not found.");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'NOT_FOUND',
            'code' => 'NOT_FOUND',
            'message' => $this->getMessage(),
        ], 404);
    }
}
