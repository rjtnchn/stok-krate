<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Enums\OrderStatus;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Domain failures (InsufficientStockException, InvalidOrderTransitionException,
 * StockIntegrityException) render themselves as JSON via their own render()
 * methods, so this controller only handles the happy path.
 */
class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    /**
     * Admin sees every order; Staff see only their own (SPEC: GET /api/orders).
     * Optional ?status=pending|confirmed|fulfilled|cancelled for the Orders tabs.
     * Returns a bare JSON array, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(OrderStatus::values())],
        ]);

        $orders = Order::query()
            ->with(['batch', 'item'])
            ->when($request->user()->role !== 'Admin', fn ($q) => $q->where('user_id', $request->user()->id))
            ->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get();

        return response()->json(OrderResource::collection($orders)->resolve());
    }

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

    /**
     * Release the reservation: reserved_qty -= qty, status -> cancelled.
     * 409 ALREADY_FULFILLED if the stock has already physically left.
     */
    public function cancel(Request $request, int $order): JsonResponse
    {
        return (new OrderResource($this->orders->cancel($request->user(), $order)))->response();
    }
}
