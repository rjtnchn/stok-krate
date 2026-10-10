<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';

    /**
     * The orders table has no created_at / updated_at (see create_orders_table);
     * `order_date` is the only timestamp.
     */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'order_date',
        'status',
        'user_id',
        'item_id',
        'batch_id',
        'quantity',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'order_date' => 'datetime',
            'status' => OrderStatus::class,
            'user_id' => 'integer',
            'item_id' => 'integer',
            'batch_id' => 'integer',
            'quantity' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
