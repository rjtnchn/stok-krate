<?php

namespace App\Http\Requests;

use App\Models\Batch;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $batch = $this->route('batch');
        $batchId = $batch instanceof Batch ? $batch->id : $batch;
        $itemId = $batch instanceof Batch ? $batch->item_id : null;

        return [
            'lot_number' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('batches', 'lot_number')
                    ->where(fn ($q) => $itemId ? $q->where('item_id', $itemId) : $q)
                    ->ignore($batchId),
            ],
            'quantity_on_hand' => ['sometimes', 'required', 'integer', 'min:0'],
            'reserved_qty' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'received_date' => ['sometimes', 'required', 'date'],
            'expiry_date' => ['nullable', 'date'],
        ];
    }
}
