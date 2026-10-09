<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * alerts table (SPEC.md): reorder_alert (FR-18) and expiry_warning (FR-14).
 * Only created_at exists - there is no updated_at column.
 */
class Alert extends Model
{
    use HasFactory;

    public const TYPE_REORDER = 'reorder_alert';

    public const TYPE_EXPIRY = 'expiry_warning';

    public const UPDATED_AT = null;

    protected $table = 'alerts';

    /** @var list<string> */
    protected $fillable = [
        'item_id',
        'batch_id',
        'alert_type',
        'resolved',
        'resolved_by',
        'resolved_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'item_id' => 'integer',
            'batch_id' => 'integer',
            'resolved' => 'boolean',
            'resolved_by' => 'integer',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
