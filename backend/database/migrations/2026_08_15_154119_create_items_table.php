<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('item_name');
            $table->string('category');
            $table->char('turnover_category', 1); // A, B, or C
            $table->boolean('is_seasonal')->default(false);
            $table->integer('reorder_point')->default(0);
            $table->decimal('current_sf', 4, 2)->default(1.00);
            $table->integer('lead_time_days')->default(0);
            $table->integer('demand_max')->default(0);
            $table->integer('lead_time_max')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
