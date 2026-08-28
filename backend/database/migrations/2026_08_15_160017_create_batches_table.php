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
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items');
            $table->string('lot_number', 50);
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('reserved_qty')->default(0);
            $table->date('received_date');
            $table->date('expiry_date')->nullable();
            $table->dateTime('last_updated');
            $table->unique(['item_id', 'lot_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
