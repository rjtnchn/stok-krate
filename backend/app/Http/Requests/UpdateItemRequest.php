<?php

namespace App\Http\Requests;

use App\Models\Item;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemRequest extends FormRequest
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
            'sku' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('items', 'sku')->ignore($itemId),
            ],
            'item_name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:255'],
            'turnover_category' => ['sometimes', 'required', 'string', 'in:A,B,C'],
            'is_seasonal' => ['sometimes', 'boolean'],
            'reorder_point' => ['sometimes', 'required', 'integer', 'min:0'],
            'current_sf' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'lead_time_days' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'demand_max' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'lead_time_max' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }
}
