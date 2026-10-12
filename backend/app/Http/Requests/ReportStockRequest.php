<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return strtolower((string) $this->user()?->role) === 'admin';
    }

    /** `category` is the ABC turnover class; accept 'a' as well as 'A'. */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('category'))) {
            $this->merge(['category' => strtoupper(trim($this->input('category')))]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'category' => ['sometimes', 'string', 'in:A,B,C'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['category.in' => 'The category must be one of A, B or C.'];
    }
}
