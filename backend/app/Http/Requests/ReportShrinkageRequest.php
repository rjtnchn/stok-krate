<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportShrinkageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return strtolower((string) $this->user()?->role) === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
        ];
    }
}
