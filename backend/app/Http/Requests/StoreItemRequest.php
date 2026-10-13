<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'item_name' => $this->input('item_name') ?? $this->input('name'),
            'is_seasonal' => $this->input('is_seasonal') ?? $this->input('seasonal_flag', false),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:255', 'unique:items,sku'],
            'item_name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'turnover_category' => ['required', 'string', 'in:A,B,C'],
            'is_seasonal' => ['sometimes', 'boolean'],
            'reorder_point' => ['required', 'integer', 'min:0'],
            'current_sf' => ['nullable', 'numeric', 'min:0'],
            'lead_time_days' => ['nullable', 'integer', 'min:0'],
            'demand_max' => ['nullable', 'integer', 'min:0'],
            'lead_time_max' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
