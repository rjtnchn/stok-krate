<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return strtolower((string) $this->user()?->role) === 'admin';
    }

    /** Accept 'admin' / 'ADMIN' / 'staff' and normalise to the stored 'Admin' / 'Staff'. */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('role'))) {
            $this->merge(['role' => ucfirst(strtolower(trim($this->input('role'))))]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'role' => ['required', 'string', 'in:Admin,Staff'],
        ];
    }
}
