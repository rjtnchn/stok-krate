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
        $table->decimal('reorder_point', 12, 2)->nullable();
        $table->decimal('current_sf', 5, 2)->default(1.0);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
