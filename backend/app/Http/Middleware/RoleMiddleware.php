<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $roleName): Response
    {
        if (!auth()->check() || !auth()->user()->role || auth()->user()->role->role_name !== $roleName) {
            abort(403, 'Access denied.');
        }
        return $next($request);
    }
}