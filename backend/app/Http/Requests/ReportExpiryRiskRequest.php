<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportExpiryRiskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return strtolower((string) $this->user()?->role) === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // default (absent) = unresolved warnings only; resolved=1 shows resolved ones
            'resolved' => ['sometimes', 'boolean'],
        ];
    }
}
