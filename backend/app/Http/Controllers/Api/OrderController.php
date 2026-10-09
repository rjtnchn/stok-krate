<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Domain failures (InsufficientStockException, InvalidOrderTransitionException,
 * StockIntegrityException) render themselves as JSON via their own render()
 * methods, so this controller only handles the happy path.
 */
class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    /**
     * Trigger 1 - place an order and reserve stock from the FEFO batch.
     *
     * 201 on success; 422 INSUFFICIENT_STOCK if reserving would take the
     * batch's available_qty below zero; 422 validation errors for bad input.
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orders->place(
            user: $request->user(),
            itemId: (int) $request->validated('item_id'),
            quantity: (int) $request->validated('quantity'),
        );

        return (new OrderResource($order->load(['batch', 'item'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Optional checkpoint: pending -> confirmed (no stock movement).
     */
    public function confirm(Request $request, int $order): JsonResponse
    {
        return (new OrderResource($this->orders->confirm($order)))->response();
    }
}
