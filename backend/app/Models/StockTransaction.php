<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransaction extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'stock_transactions';

    /**
     * Immutable log: stock transactions do not have updated_at.
     */
    public const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'batch_id',
        'user_id',
        'type',
        'quantity',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'batch_id' => 'integer',
            'user_id' => 'integer',
            'quantity' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the batch associated with this transaction.
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the user who initiated this transaction.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record an immutable stock transaction log entry.
     *
     * @param  int  $batchId
     * @param  int  $userId
     * @param  string  $type ('add', 'deduct', 'reserve', 'release', etc.)
     * @param  int  $quantity
     * @return static
     */
    public static function recordTransaction(int $batchId, int $userId, string $type, int $quantity): self
    {
        return static::create([
            'batch_id' => $batchId,
            'user_id' => $userId,
            'type' => $type,
            'quantity' => $quantity,
        ]);
    }
}
