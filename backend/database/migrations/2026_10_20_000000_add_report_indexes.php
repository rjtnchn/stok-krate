<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            if (! Schema::hasIndex('stock_transactions', 'stock_transactions_type_created_at_index')) {
                $table->index(['type', 'created_at'], 'stock_transactions_type_created_at_index');
            }
        });

        Schema::table('alerts', function (Blueprint $table) {
            if (! Schema::hasIndex('alerts', 'alerts_alert_type_resolved_index')) {
                $table->index(['alert_type', 'resolved'], 'alerts_alert_type_resolved_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            if (Schema::hasIndex('stock_transactions', 'stock_transactions_type_created_at_index')) {
                $table->dropIndex('stock_transactions_type_created_at_index');
            }
        });

        Schema::table('alerts', function (Blueprint $table) {
            if (Schema::hasIndex('alerts', 'alerts_alert_type_resolved_index')) {
                $table->dropIndex('alerts_alert_type_resolved_index');
            }
        });
    }
};
