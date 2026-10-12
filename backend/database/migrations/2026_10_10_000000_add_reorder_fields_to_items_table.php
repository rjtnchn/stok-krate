<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            if (! Schema::hasColumn('items', 'reorder_point')) {
                $table->integer('reorder_point')->default(0);
            }
            if (! Schema::hasColumn('items', 'current_sf')) {
                $table->decimal('current_sf', 4, 2)->default(1.00);
            }
        });
    }

    public function down(): void
    {
        // Intentionally empty - see class docblock.
    }
};
