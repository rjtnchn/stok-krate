<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@wb.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('admin123'),
                'role' => 'Admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'staff@wb.com'],
            [
                'name' => 'Staff User',
                'password' => bcrypt('staff123'),
                'role' => 'Staff',
            ]
        );

        $this->call(ItemSeeder::class);
    }
}
