<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Exceptions\InvalidOrderTransitionException;
use App\Exceptions\OrderNotFoundException;
use App\Exceptions\StockIntegrityException;
use App\Models\Batch;
use App\Models\Order;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Two-phase stock handling:
 *
 *   place()   Trigger 1 - reserve: reserved_qty += qty            (quantity_on_hand untouched)
 *   fulfil()  Trigger 2 - deduct:  quantity_on_hand -= qty AND reserved_qty -= qty
 *
 * Everything that reads-then-writes a batch does so inside DB::transaction()
 * with lockForUpdate(), so two requests can never both act on the same unit.
 */
class OrderService
{
    public function __construct(private readonly FefoBatchSelector $fefo) {}

    /**
     * Trigger 1 - Sale Reservation.
     *
     * @throws \App\Exceptions\InsufficientStockException (-> 422 INSUFFICIENT_STOCK)
     */
    public function place(User $user, int $itemId, int $quantity): Order
    {
        return DB::transaction(function () use ($user, $itemId, $quantity): Order {
            // Locks the eligible batch rows (FOR UPDATE) and throws if the FEFO
            // batch cannot cover the quantity, i.e. if reserving would take
            // available_qty below zero. Throwing rolls the transaction back.
            $batch = $this->fefo->select($itemId, $quantity);

            // Safe read-modify-write: we hold the row lock, and the model was
            // loaded by the locking query, so these values cannot be stale.
            $batch->reserved_qty += $quantity;
            $batch->last_updated = now();
            $batch->save();

            StockTransaction::recordTransaction($batch->id, $user->id, 'reservation', $quantity);

            return Order::create([
                'order_date' => now(),
                'status' => OrderStatus::Pending,
                'user_id' => $user->id,
                'item_id' => $itemId,
                'batch_id' => $batch->id,
                'quantity' => $quantity,
            ]);
        });
    }

    /**
     * Optional checkpoint: pending -> confirmed. Stock is not touched.
     *
     * @throws OrderNotFoundException
     * @throws InvalidOrderTransitionException
     */
    public function confirm(int $orderId): Order
    {
        return DB::transaction(function () use ($orderId): Order {
            $order = $this->lockOrder($orderId);
            $this->assertCanMove($order, OrderStatus::Confirmed);

            $order->status = OrderStatus::Confirmed;
            $order->save();

            return $order;
        });
    }

    /**
     * Trigger 2 - Stock Deduction on Fulfillment (Packing Station scan).
     *
     * The order row is locked first, so a double scan serialises: the second
     * request waits, then sees `fulfilled` and gets 409 instead of deducting twice.
     *
     * @throws OrderNotFoundException (-> 404 NOT_FOUND)
     * @throws InvalidOrderTransitionException (-> 409 ALREADY_FULFILLED / ORDER_CANCELLED)
     * @throws StockIntegrityException (-> 500, nothing written)
     */
    public function fulfil(User $user, int $orderId): Order
    {
        return DB::transaction(function () use ($user, $orderId): Order {
            $order = $this->lockOrder($orderId);
            $this->assertCanMove($order, OrderStatus::Fulfilled);

            /** @var Batch $batch */
            $batch = Batch::query()->whereKey($order->batch_id)->lockForUpdate()->firstOrFail();

            // Never write a negative number: this "cannot happen" if place()
            // and fulfil() are the only writers, so if it does, shout.
            if ($batch->reserved_qty < $order->quantity || $batch->quantity_on_hand < $order->quantity) {
                Log::critical('Stock integrity anomaly while fulfilling order', [
                    'order_id' => $order->id,
                    'batch_id' => $batch->id,
                    'order_quantity' => $order->quantity,
                    'quantity_on_hand' => $batch->quantity_on_hand,
                    'reserved_qty' => $batch->reserved_qty,
                ]);

                throw new StockIntegrityException("Cannot fulfil order {$order->id}: batch {$batch->id} would go negative.");
            }

            $batch->quantity_on_hand -= $order->quantity;
            $batch->reserved_qty -= $order->quantity;
            $batch->last_updated = now();
            $batch->save();

            StockTransaction::recordTransaction($batch->id, $user->id, 'fulfillment', -$order->quantity);

            $order->status = OrderStatus::Fulfilled;
            $order->save();

            return $order;
        });
    }

    /**
     * Fetch an order with a row lock. Must be called inside a transaction.
     *
     * @throws OrderNotFoundException
     */
    private function lockOrder(int $orderId): Order
    {
        return Order::query()->whereKey($orderId)->lockForUpdate()->first()
            ?? throw new OrderNotFoundException($orderId);
    }

    /**
     * @throws InvalidOrderTransitionException
     */
    private function assertCanMove(Order $order, OrderStatus $target): void
    {
        if ($order->status->canTransitionTo($target)) {
            return;
        }

        throw match ($order->status) {
            OrderStatus::Fulfilled => new InvalidOrderTransitionException(
                'ALREADY_FULFILLED', "Order {$order->id} is already fulfilled."
            ),
            OrderStatus::Cancelled => new InvalidOrderTransitionException(
                'ORDER_CANCELLED', "Order {$order->id} was cancelled."
            ),
            default => new InvalidOrderTransitionException(
                'INVALID_STATUS_TRANSITION',
                "Order {$order->id} is {$order->status->value} and cannot move to {$target->value}."
            ),
        };
    }
}
