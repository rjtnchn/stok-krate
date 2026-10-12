<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('alerts')) {
            return;
        }

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->nullable()->constrained();
            $table->foreignId('batch_id')->nullable()->constrained();
            $table->string('alert_type', 30);
            $table->boolean('resolved')->default(false);
            $table->foreignId('resolved_by')->nullable()->constrained('users');
            $table->dateTime('resolved_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        // Intentionally empty - see class docblock.
    }
};
