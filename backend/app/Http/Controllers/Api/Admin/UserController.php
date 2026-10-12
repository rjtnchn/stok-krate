<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Admin user management (FR-03). Mounted under /api/admin/users behind
 * auth:sanctum + the `admin` middleware.
 *
 * DELETE deactivates (soft) instead of removing the row: users are referenced
 * by orders and stock_transactions, which are an immutable audit trail.
 */
class UserController extends Controller
{
    /** GET /api/admin/users[?role=&status=active|deactivated&search=&per_page=] */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'role' => ['sometimes', 'string', 'in:admin,staff,Admin,Staff'],
            'status' => ['sometimes', 'string', 'in:active,deactivated'],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $users = User::query()
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->where('role', ucfirst(strtolower($role))))
            ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->whereNull('deactivated_at'))
            ->when(($filters['status'] ?? null) === 'deactivated', fn ($q) => $q->whereNotNull('deactivated_at'))
            ->when($filters['search'] ?? null, function ($q, $term) {
                $q->where(fn ($w) => $w->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"));
            })
            ->orderBy('name')
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();

        return UserResource::collection($users);
    }

    /** GET /api/admin/users/{user} */
    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    /** POST /api/admin/users */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated()); // password is hashed by the model cast

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * PUT|PATCH /api/admin/users/{user}  (partial updates allowed)
     *
     * Guards: an Admin cannot deactivate or demote their OWN account, which also
     * guarantees at least one active Admin always remains.
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse|UserResource
    {
        $data = $request->validated();
        $isSelf = $request->user()->is($user);

        if ($isSelf && array_key_exists('is_active', $data) && ! $data['is_active']) {
            return $this->selfDeactivationForbidden();
        }

        if ($isSelf && array_key_exists('role', $data) && strtolower($data['role']) !== strtolower($user->role)) {
            return response()->json([
                'error' => 'SELF_DEMOTION_FORBIDDEN',
                'message' => 'You cannot change your own role.',
            ], 403);
        }

        DB::transaction(function () use ($data, $user, $isSelf) {
            $isActive = $data['is_active'] ?? null;
            unset($data['is_active']);

            $user->fill($data);

            if ($isActive === false && $user->isActive()) {
                $user->deactivated_at = now();
            } elseif ($isActive === true) {
                $user->deactivated_at = null;
            }

            $user->save();

            // A deactivated account, or one whose password an admin just reset, must
            // not keep working with tokens issued earlier.
            if (! $user->isActive() || (isset($data['password']) && ! $isSelf)) {
                $user->tokens()->delete();
            }
        });

        return new UserResource($user->refresh());
    }

    /**
     * DELETE /api/admin/users/{user} - deactivates the account (SPEC.md FR-03).
     */
    public function destroy(Request $request, User $user): JsonResponse|UserResource
    {
        if ($request->user()->is($user)) {
            return $this->selfDeactivationForbidden();
        }

        if (! $user->isActive()) {
            return response()->json([
                'error' => 'ALREADY_DEACTIVATED',
                'message' => "User {$user->id} is already deactivated.",
            ], 409);
        }

        DB::transaction(function () use ($user) {
            $user->forceFill(['deactivated_at' => now()])->save();
            $user->tokens()->delete();
        });

        return new UserResource($user->refresh());
    }

    private function selfDeactivationForbidden(): JsonResponse
    {
        return response()->json([
            'error' => 'SELF_DEACTIVATION_FORBIDDEN',
            'message' => 'You cannot deactivate your own account.',
        ], 403);
    }
}
