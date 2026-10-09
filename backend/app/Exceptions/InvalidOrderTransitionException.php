<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Thrown when an order is moved to a status it cannot reach from where it is.
 * Rendered as 409 with an error code such as ALREADY_FULFILLED / ORDER_CANCELLED.
 */
class InvalidOrderTransitionException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => $this->errorCode,
            'code' => $this->errorCode,
            'message' => $this->getMessage(),
        ], 409);
    }
}
