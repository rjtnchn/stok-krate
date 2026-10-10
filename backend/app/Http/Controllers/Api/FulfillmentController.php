<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Packing Station endpoint. Hitting this is the moment stock physically leaves
 * the building, so it is the only place quantity_on_hand is ever decremented
 * for an order (the "Mystery Shrinkage" fix).
 */
class FulfillmentController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    /**
     * Trigger 2 - mark the order fulfilled and deduct quantity_on_hand and
     * reserved_qty on its batch, atomically.
     *
     * 200 on success; 404 NOT_FOUND; 409 ALREADY_FULFILLED / ORDER_CANCELLED.
     */
    public function __invoke(Request $request, int $order): JsonResponse
    {
        $fulfilled = $this->orders->fulfil($request->user(), $order);

        return (new OrderResource($fulfilled))->response();
    }
}
