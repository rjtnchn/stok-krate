<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\Support\BuildsReportFixtures;
use Tests\TestCase;

/** /api/admin/users - CRUD (admin only; DELETE deactivates). Access control is also covered in Sprint5RouteProtectionTest. */
class AdminUserManagementTest extends TestCase
{
    use BuildsReportFixtures;
    use DatabaseTransactions;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->makeUser('Admin', ['name' => 'Root Admin']);
    }

    private function as(?User $user = null): static
    {
        return $this->actingAs($user ?? $this->admin, 'sanctum');
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New Person',
            'email' => 'new_'.uniqid().'@test.ph',
            'password' => 'password123',
            'role' => 'Staff',
        ], $overrides);
    }

    // --- index / show -----------------------------------------------------

    public function test_index_lists_users_safely_and_paginated(): void
    {
        foreach (range(1, 4) as $i) {
            $this->makeUser('Staff');
        }

        $json = $this->as()->getJson('/api/admin/users?per_page=3')->assertOk()->json();

        $this->assertCount(3, $json['data']);
        $this->assertGreaterThanOrEqual(5, $json['meta']['total']);
        $this->assertSame(3, $json['meta']['per_page']);
        $this->assertSame(
            ['id', 'name', 'email', 'role', 'is_active', 'deactivated_at', 'created_at', 'updated_at'],
            array_keys($json['data'][0])
        );
        $this->assertStringNotContainsString('password', json_encode($json));
        $this->assertStringNotContainsString('remember_token', json_encode($json));
    }

    public function test_index_filters_by_role_status_and_search(): void
    {
        $this->makeUser('Staff', ['name' => 'Zed Findable', 'email' => 'zed_find@test.ph']);
        $gone = $this->makeUser('Staff', ['name' => 'Gone Person', 'deactivated_at' => now()]);

        $byRole = $this->as()->getJson('/api/admin/users?role=admin&per_page=100')->assertOk()->json('data');
        $this->assertNotEmpty($byRole);
        $this->assertSame(['Admin'], array_unique(array_column($byRole, 'role')));

        $deactivated = $this->as()->getJson('/api/admin/users?status=deactivated&per_page=100')->json('data');
        $this->assertContains($gone->id, array_column($deactivated, 'id'));
        $this->assertSame([false], array_unique(array_column($deactivated, 'is_active')));

        $active = $this->as()->getJson('/api/admin/users?status=active&per_page=100')->json('data');
        $this->assertNotContains($gone->id, array_column($active, 'id'));

        $found = $this->as()->getJson('/api/admin/users?search=zed_find')->json('data');
        $this->assertSame(['Zed Findable'], array_column($found, 'name'));

        $this->as()->getJson('/api/admin/users?role=manager')->assertStatus(422)->assertJsonValidationErrors(['role']);
    }

    public function test_show_returns_one_user_or_404(): void
    {
        $user = $this->makeUser('Staff', ['name' => 'Showme']);

        $this->as()->getJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Showme')
            ->assertJsonPath('data.role', 'Staff')
            ->assertJsonPath('data.is_active', true);

        $this->as()->getJson('/api/admin/users/999999')->assertStatus(404);
    }

    // --- store ------------------------------------------------------------------

    public function test_store_creates_a_user_with_a_hashed_password(): void
    {
        $data = $this->payload(['name' => 'Alice', 'email' => 'alice@test.ph']);

        $this->as()->postJson('/api/admin/users', $data)
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'Alice')
            ->assertJsonPath('data.email', 'alice@test.ph')
            ->assertJsonPath('data.role', 'Staff')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonMissingPath('data.password');

        $user = User::where('email', 'alice@test.ph')->firstOrFail();
        $this->assertNotSame('password123', $user->password, 'password must not be stored in plain text');
        $this->assertTrue(Hash::check('password123', $user->password));
    }

    public function test_lowercase_role_names_are_accepted_and_normalised_to_the_stored_value(): void
    {
        $this->as()->postJson('/api/admin/users', $this->payload(['email' => 'lc_admin@test.ph', 'role' => 'admin']))
            ->assertStatus(201)->assertJsonPath('data.role', 'Admin');
        $this->as()->postJson('/api/admin/users', $this->payload(['email' => 'lc_staff@test.ph', 'role' => 'STAFF']))
            ->assertStatus(201)->assertJsonPath('data.role', 'Staff');

        $this->assertSame('Admin', User::where('email', 'lc_admin@test.ph')->value('role'));
    }

    public function test_store_validates_its_input(): void
    {
        $this->as()->postJson('/api/admin/users', [])->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password', 'role']);

        $this->as()->postJson('/api/admin/users', $this->payload(['email' => 'not-an-email']))
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
        $this->as()->postJson('/api/admin/users', $this->payload(['password' => 'short']))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);
        $this->as()->postJson('/api/admin/users', $this->payload(['role' => 'superuser']))
            ->assertStatus(422)->assertJsonValidationErrors(['role']);

        $taken = $this->makeUser('Staff', ['email' => 'taken@test.ph']);
        $this->as()->postJson('/api/admin/users', $this->payload(['email' => $taken->email]))
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    // --- update -----------------------------------------------------------------

    public function test_update_changes_only_the_fields_sent(): void
    {
        $user = $this->makeUser('Staff', ['name' => 'Before', 'email' => 'before@test.ph']);

        $this->as()->putJson("/api/admin/users/{$user->id}", ['name' => 'After'])
            ->assertOk()->assertJsonPath('data.name', 'After')->assertJsonPath('data.email', 'before@test.ph');

        $this->as()->putJson("/api/admin/users/{$user->id}", ['role' => 'admin'])
            ->assertOk()->assertJsonPath('data.role', 'Admin');
    }

    public function test_update_email_uniqueness_ignores_the_user_themself(): void
    {
        $user = $this->makeUser('Staff', ['email' => 'mine@test.ph']);
        $other = $this->makeUser('Staff', ['email' => 'theirs@test.ph']);

        $this->as()->putJson("/api/admin/users/{$user->id}", ['email' => 'mine@test.ph', 'name' => 'Same email ok'])->assertOk();
        $this->as()->putJson("/api/admin/users/{$user->id}", ['email' => $other->email])
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_an_admin_password_reset_is_hashed_and_signs_the_user_out_everywhere(): void
    {
        $user = $this->makeUser('Staff');
        $user->createToken('phone');
        $user->createToken('laptop');
        $this->assertSame(2, $user->tokens()->count());

        $this->as()->putJson("/api/admin/users/{$user->id}", ['password' => 'brand-new-pass-1'])->assertOk();

        $this->assertTrue(Hash::check('brand-new-pass-1', $user->refresh()->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_update_can_deactivate_and_reactivate(): void
    {
        $user = $this->makeUser('Staff');

        $this->as()->putJson("/api/admin/users/{$user->id}", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertNotNull($user->refresh()->deactivated_at);

        $this->as()->putJson("/api/admin/users/{$user->id}", ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertNull($user->refresh()->deactivated_at);
    }

    public function test_an_admin_cannot_deactivate_or_demote_themself(): void
    {
        $this->as()->putJson("/api/admin/users/{$this->admin->id}", ['is_active' => false])
            ->assertStatus(403)->assertJsonPath('error', 'SELF_DEACTIVATION_FORBIDDEN');

        $this->as()->putJson("/api/admin/users/{$this->admin->id}", ['role' => 'staff'])
            ->assertStatus(403)->assertJsonPath('error', 'SELF_DEMOTION_FORBIDDEN');

        // harmless self-edits are fine, including re-sending the current role
        $this->as()->putJson("/api/admin/users/{$this->admin->id}", ['name' => 'Renamed Admin', 'role' => 'admin'])
            ->assertOk()->assertJsonPath('data.name', 'Renamed Admin');

        $this->assertTrue($this->admin->refresh()->isActive());
        $this->assertSame('Admin', $this->admin->role);
    }

    public function test_update_validates_input_and_404s_for_unknown_users(): void
    {
        $user = $this->makeUser('Staff');

        $this->as()->putJson("/api/admin/users/{$user->id}", ['role' => 'root'])->assertStatus(422)->assertJsonValidationErrors(['role']);
        $this->as()->putJson("/api/admin/users/{$user->id}", ['password' => 'short'])->assertStatus(422)->assertJsonValidationErrors(['password']);
        $this->as()->putJson("/api/admin/users/{$user->id}", ['is_active' => 'maybe'])->assertStatus(422)->assertJsonValidationErrors(['is_active']);
        $this->as()->putJson('/api/admin/users/999999', ['name' => 'x'])->assertStatus(404);
    }

    // --- destroy (= deactivate) ---------------------------------------------------------

    public function test_delete_deactivates_instead_of_removing_and_revokes_tokens(): void
    {
        $victim = $this->makeUser('Staff');
        $token = $victim->createToken('t')->plainTextToken;
        $batch = $this->makeBatch($this->makeItem());
        $this->logTx($batch, $victim, 'add', 5); // history referencing the user

        $this->as()->deleteJson("/api/admin/users/{$victim->id}")
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('users', ['id' => $victim->id]);       // row kept (audit trail intact)
        $this->assertNotNull($victim->refresh()->deactivated_at);
        $this->assertSame(0, $victim->tokens()->count());
        $this->assertDatabaseHas('stock_transactions', ['user_id' => $victim->id]);

        // the old token no longer authenticates
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertStatus(401);
    }

    public function test_delete_guards(): void
    {
        $this->as()->deleteJson("/api/admin/users/{$this->admin->id}")
            ->assertStatus(403)->assertJsonPath('error', 'SELF_DEACTIVATION_FORBIDDEN');
        $this->assertTrue($this->admin->refresh()->isActive());

        $victim = $this->makeUser('Staff');
        $this->as()->deleteJson("/api/admin/users/{$victim->id}")->assertOk();
        $this->as()->deleteJson("/api/admin/users/{$victim->id}")
            ->assertStatus(409)->assertJsonPath('error', 'ALREADY_DEACTIVATED');

        $this->as()->deleteJson('/api/admin/users/999999')->assertStatus(404);
    }

    public function test_a_deactivated_user_cannot_log_in(): void
    {
        $victim = $this->makeUser('Staff', ['email' => 'loginblock@test.ph']);
        $this->as()->deleteJson("/api/admin/users/{$victim->id}")->assertOk();

        $this->app['auth']->forgetGuards();
        $response = $this->postJson('/api/login', ['email' => 'loginblock@test.ph', 'password' => 'password123']);

        $this->assertContains($response->getStatusCode(), [401, 403]);
        $this->assertNull($response->json('token'));
    }
}
