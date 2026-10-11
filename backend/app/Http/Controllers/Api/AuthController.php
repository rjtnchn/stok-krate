<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate user and issue a Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->deactivated_at !== null) {
            return response()->json([
                'message' => 'This account has been deactivated.',
            ], 403);
        }

        $token = $user->createToken('wb-ims-auth-token')->plainTextToken;

        return response()->json([
            'message'      => 'Login successful',
            'token'        => $token,
            'access_token' => $token,
            'token_type'   => 'Bearer',
            // `role` is a plain ENUM column on users (SPEC v1.1 dropped the roles
            // table), so it is already part of the user JSON - no relation to load.
            'user'         => $user,
        ]);
    }

    /**
     * Revoke the current authenticated user's access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Get the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }
}