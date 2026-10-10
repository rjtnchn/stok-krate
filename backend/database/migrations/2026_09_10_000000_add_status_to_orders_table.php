<?php

use App\Enums\OrderStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 3 - order status progression: pending -> confirmed -> fulfilled.
 *
 * `orders.status` was already created in Sprint 1 as a bare VARCHAR(20) NOT NULL
 * with no default, so on an existing database this migration hardens it:
 *   - default 'pending' (a new order always starts pending),
 *   - an index (the Orders screen filters by status),
 *   - a CHECK constraint so only known statuses can be stored (MySQL 8.0.16+).
 * On a database where the column is somehow missing, it is added instead.
 *
 * The *order* of transitions (pending -> confirmed -> fulfilled) is enforced in
 * App\Enums\OrderStatus; a CHECK constraint can only restrict values, not paths.
 */
return new class extends Migration
{
    private const CHECK_NAME = 'orders_status_check';

    public function up(): void
    {
        if (! Schema::hasColumn('orders', 'status')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('status', 20)->default(OrderStatus::Pending->value)->index();
            });
        } else {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('status', 20)->default(OrderStatus::Pending->value)->change();
                $table->index('status');
            });
        }

        if ($this->supportsCheckConstraints()) {
            $allowed = "'".implode("','", OrderStatus::values())."'";
            DB::statement('ALTER TABLE orders ADD CONSTRAINT '.self::CHECK_NAME." CHECK (status IN ({$allowed}))");
        }
    }

    public function down(): void
    {
        if ($this->supportsCheckConstraints()) {
            DB::statement('ALTER TABLE orders DROP CHECK '.self::CHECK_NAME);
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->string('status', 20)->default(null)->change();
        });
    }

    private function supportsCheckConstraints(): bool
    {
        return DB::getDriverName() === 'mysql';
    }
};
