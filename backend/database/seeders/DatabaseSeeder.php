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
<<<<<<< HEAD
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
=======
        User::firstOrCreate(
            ['email' => 'admin@walangbrownout.ph'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'role' => 'Admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'staff@walangbrownout.ph'],
            [
                'name' => 'Staff User',
                'password' => bcrypt('password'),
                'role' => 'Staff',
            ]
        );

        $this->call(ItemSeeder::class);
>>>>>>> 0b36525 (feat: implement items, batches, and stock transaction backend (sprint 2))
    }
}