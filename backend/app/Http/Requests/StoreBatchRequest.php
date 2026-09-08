<?php

namespace App\Http\Requests;

use App\Models\Item;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBatchRequest extends FormRequest
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
        $itemId = $this->route('item') instanceof Item
            ? $this->route('item')->id
            : $this->route('item');

        return [
            'lot_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('batches', 'lot_number')->where(function ($query) use ($itemId) {
                    return $itemId ? $query->where('item_id', $itemId) : $query;
                }),
            ],
            'quantity_on_hand' => ['required', 'integer', 'min:0'],
            'reserved_qty' => ['nullable', 'integer', 'min:0', 'lte:quantity_on_hand'],
            'received_date' => ['required', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:received_date'],
        ];
    }
}
