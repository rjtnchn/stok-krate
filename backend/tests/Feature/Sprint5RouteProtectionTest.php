<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureAdmin;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\BuildsReportFixtures;
use Tests\TestCase;

/**
 * Route protection matrix for EVERY Sprint 5 endpoint:
 *   no token -> 401 | Staff -> 403 FORBIDDEN | deactivated Admin -> 403 | Admin -> allowed.
 */
class Sprint5RouteProtectionTest extends TestCase
{
    use BuildsReportFixtures;
    use DatabaseTransactions;

    /** @return array<string, array{0: string, 1: string, 2: array<string, mixed>}> */
    public static function endpoints(): array
    {
        return [
            'GET reports/stock' => ['GET', '/api/reports/stock', []],
            'GET reports/shrinkage' => ['GET', '/api/reports/shrinkage', []],
            'GET reports/expiry-risks' => ['GET', '/api/reports/expiry-risks', []],
            'GET reports/activity-log' => ['GET', '/api/reports/activity-log', []],
            'GET admin/users' => ['GET', '/api/admin/users', []],
            'GET admin/users/{id}' => ['GET', '/api/admin/users/{id}', []],
            'POST admin/users' => ['POST', '/api/admin/users', ['name' => 'N', 'email' => 'route_matrix@test.ph', 'password' => 'password123', 'role' => 'Staff']],
            'PUT admin/users/{id}' => ['PUT', '/api/admin/users/{id}', ['name' => 'Renamed']],
            'DELETE admin/users/{id}' => ['DELETE', '/api/admin/users/{id}', []],
        ];
    }

    /** @param  array<string, mixed>  $payload */
    #[DataProvider('endpoints')]
    public function test_unauthenticated_requests_get_401(string $method, string $uri, array $payload): void
    {
        $victim = $this->makeUser('Staff');

        $this->json($method, str_replace('{id}', (string) $victim->id, $uri), $payload)->assertStatus(401);
    }

    /** @param  array<string, mixed>  $payload */
    #[DataProvider('endpoints')]
    public function test_staff_is_forbidden_everywhere(string $method, string $uri, array $payload): void
    {
        $victim = $this->makeUser('Staff');

        $this->actingAs($this->makeUser('Staff'), 'sanctum')
            ->json($method, str_replace('{id}', (string) $victim->id, $uri), $payload)
            ->assertStatus(403)
            ->assertJsonPath('error', 'FORBIDDEN');

        $this->assertNull($victim->refresh()->deactivated_at, 'A forbidden DELETE must not deactivate anyone.');
        $this->assertNotSame('Renamed', $victim->name, 'A forbidden PUT must not change anyone.');
        $this->assertDatabaseMissing('users', ['email' => 'route_matrix@test.ph']);
    }

    /** @param  array<string, mixed>  $payload */
    #[DataProvider('endpoints')]
    public function test_a_deactivated_admin_is_refused_even_with_a_valid_token(string $method, string $uri, array $payload): void
    {
        $victim = $this->makeUser('Staff');
        $ex = $this->makeUser('Admin', ['deactivated_at' => now()]);

        $this->actingAs($ex, 'sanctum')
            ->json($method, str_replace('{id}', (string) $victim->id, $uri), $payload)
            ->assertStatus(403)
            ->assertJsonPath('error', 'ACCOUNT_DEACTIVATED');
    }

    /** @param  array<string, mixed>  $payload */
    #[DataProvider('endpoints')]
    public function test_an_active_admin_is_let_through(string $method, string $uri, array $payload): void
    {
        $victim = $this->makeUser('Staff');

        $status = $this->actingAs($this->makeUser('Admin'), 'sanctum')
            ->json($method, str_replace('{id}', (string) $victim->id, $uri), $payload)
            ->getStatusCode();

        $this->assertContains($status, [200, 201], "Admin should reach {$method} {$uri}, got {$status}");
    }

    public function test_real_bearer_tokens_are_enforced_end_to_end(): void
    {
        $staffToken = $this->makeUser('Staff')->createToken('t')->plainTextToken;
        $adminToken = $this->makeUser('Admin')->createToken('t')->plainTextToken;

        // The auth guard caches the resolved user for the life of the test app, so
        // forget it between requests that use different tokens.
        $this->withToken($staffToken)->getJson('/api/reports/shrinkage')->assertStatus(403);
        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->getJson('/api/reports/shrinkage')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken('not-a-real-token')->getJson('/api/reports/shrinkage')->assertStatus(401);
    }

    public function test_the_middleware_accepts_the_lowercase_role_names_used_in_the_docs(): void
    {
        $ask = function (string $role): int {
            $request = Request::create('/x');
            $request->setUserResolver(fn () => new User(['role' => $role]));

            return (new EnsureAdmin)->handle($request, fn () => response('ok'))->getStatusCode();
        };

        $this->assertSame(200, $ask('Admin'));
        $this->assertSame(200, $ask('admin'));
        $this->assertSame(403, $ask('Staff'));
        $this->assertSame(403, $ask('staff'));
        $this->assertSame(403, $ask(''));
    }
}
