<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['role_name' => 'Admin']);
        Role::firstOrCreate(['role_name' => 'Staff']);

        if (!User::where('email', 'admin@example.com')->exists()) {
            User::create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => Hash::make('password123'),
                'role_id' => 1,
            ]);
        }

        if (!User::where('email', 'staff@example.com')->exists()) {
            User::create([
                'name' => 'Staff User',
                'email' => 'staff@example.com',
                'password' => Hash::make('password123'),
                'role_id' => 2,
            ]);
        }
    }
}