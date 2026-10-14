<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return strtolower((string) $this->user()?->role) === 'admin';
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('role'))) {
            $this->merge(['role' => ucfirst(strtolower(trim($this->input('role'))))]);
        }
    }

    /**
     * PUT accepts partial updates: only the fields sent are changed.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $target = $this->route('user');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target?->id)],
            'password' => ['sometimes', 'required', 'string', Password::min(8)],
            'role' => ['sometimes', 'required', 'string', 'in:Admin,Staff'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ];
    }
}
