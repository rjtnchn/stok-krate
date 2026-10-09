<?php

namespace App\Enums;

/**
 * Order lifecycle: pending -> confirmed -> fulfilled.
 *
 * `cancelled` is a terminal side-branch kept because SPEC.md (orders.status) and
 * the frontend already use it; nothing in Sprint 3 moves an order into it yet.
 *
 * Stock only physically leaves on the transition to `fulfilled`
 * (Packing Station scan) - see OrderService::fulfil().
 */
enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Fulfilled = 'fulfilled';
    case Cancelled = 'cancelled';

    /**
     * Statuses this one may legally move to.
     *
     * `pending -> fulfilled` is allowed (skipping `confirmed`) so the SPEC /
     * frontend flow, where the Packing Station scans a freshly placed order,
     * keeps working. `confirmed` is an optional checkpoint, not a gate.
     *
     * @return list<self>
     */
    public function allowedNext(): array
    {
        return match ($this) {
            self::Pending => [self::Confirmed, self::Fulfilled, self::Cancelled],
            self::Confirmed => [self::Fulfilled, self::Cancelled],
            self::Fulfilled, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedNext(), true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $s) => $s->value, self::cases());
    }
}
