<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'batches';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'item_id',
        'lot_number',
        'quantity_on_hand',
        'reserved_qty',
        'received_date',
        'expiry_date',
        'last_updated',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity_on_hand' => 'integer',
            'reserved_qty' => 'integer',
            'received_date' => 'date',
            'expiry_date' => 'date',
            'last_updated' => 'datetime',
        ];
    }

    /**
     * Get the item that owns the batch.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get the transactions for the batch.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }

    /**
     * Get the available quantity (on hand minus reserved).
     */
    public function getAvailableQuantityAttribute(): int
    {
        return max(0, $this->quantity_on_hand - $this->reserved_qty);
    }
}
