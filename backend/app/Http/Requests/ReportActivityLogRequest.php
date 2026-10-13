<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportActivityLogRequest extends FormRequest
{
    /** Every transaction type the system has ever written (see TransactionResource). */
    public const TYPES = ['add', 'receipt', 'deduct', 'reservation', 'fulfillment', 'cancellation', 'adjustment'];

    public function authorize(): bool
    {
        return strtolower((string) $this->user()?->role) === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'string', 'in:'.implode(',', self::TYPES)],
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'item_id' => ['sometimes', 'integer', 'exists:items,id'],
            'batch_id' => ['sometimes', 'integer', 'exists:batches,id'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'order' => ['sometimes', 'string', 'in:asc,desc'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
