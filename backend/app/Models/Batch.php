<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
     * Always include the computed available_qty when a batch is serialised to
     * JSON (SPEC.md: "available_qty computed server-side, not stored").
     *
     * @var list<string>
     */
    protected $appends = ['available_qty'];

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
     * available_qty = quantity_on_hand - reserved_qty (FR-07).
     *
     * Computed on the fly and never stored - there is deliberately no
     * `available_qty` column. It is also deliberately NOT clamped at zero: if
     * bad data ever pushes reserved_qty above quantity_on_hand, a negative
     * number here is a loud signal, whereas max(0, ...) would hide it.
     */
    protected function availableQty(): Attribute
    {
        return Attribute::get(
            fn (): int => (int) $this->quantity_on_hand - (int) $this->reserved_qty
        );
    }
}
