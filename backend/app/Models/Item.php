<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'items';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'sku',
        'item_name',
        'category',
        'turnover_category',
        'is_seasonal',
        'reorder_point',
        'current_sf',
        'lead_time_days',
        'demand_max',
        'lead_time_max',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_seasonal' => 'boolean',
            'reorder_point' => 'integer',
            'current_sf' => 'decimal:2',
            'lead_time_days' => 'integer',
            'demand_max' => 'integer',
            'lead_time_max' => 'integer',
        ];
    }

    /**
     * Get the batches associated with the item.
     */
    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    /**
     * Get the total stock quantity on hand across all batches.
     */
    public function getTotalQuantityOnHandAttribute(): int
    {
        return (int) $this->batches()->sum('quantity_on_hand');
    }

    /**
     * Get the total reserved quantity across all batches.
     */
    public function getTotalReservedQtyAttribute(): int
    {
        return (int) $this->batches()->sum('reserved_qty');
    }
}
