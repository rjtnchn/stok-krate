<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
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
    }
}
