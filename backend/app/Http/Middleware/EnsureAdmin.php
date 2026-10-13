<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin-only gate for Sprint 5 (reports + user management).
 *
 * Runs AFTER auth:sanctum, so an unauthenticated request never gets here (it
 * receives 401 from Sanctum). Compared with the older `role:Admin` alias this:
 *   - returns SPEC.md's { error: "FORBIDDEN" } body (FR-04),
 *   - compares the role case-insensitively ('Admin' as stored, 'admin' as in docs),
 *   - refuses a deactivated account even if it still holds a valid token.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->deactivated_at !== null) {
            return response()->json([
                'error' => 'ACCOUNT_DEACTIVATED',
                'message' => 'This account has been deactivated.',
            ], 403);
        }

        if (strtolower((string) $user->role) !== 'admin') {
            return response()->json([
                'error' => 'FORBIDDEN',
                'message' => 'Administrator access is required.',
            ], 403);
        }

        return $next($request);
    }
}
