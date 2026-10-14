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
                'name' => 'Admin',
                'password' => bcrypt('admin123'),
                'role' => 'Admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'staff@wb.com'],
            [
                'name' => 'Staff',
                'password' => bcrypt('staff123'),
                'role' => 'Staff',
            ]
        );

        User::firstOrCreate(
            ['email' => 'ralph@wb.com'],
            [
                'name' => 'Ralph Clemeno',
                'password' => bcrypt('ralph123'),
                'role' => 'Admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'johnpaul@wb.com'],
            [
                'name' => 'Johnpaul Consorte',
                'password' => bcrypt('johnpaul123'),
                'role' => 'Admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'aaron@wb.com'],
            [
                'name' => 'Aaron Cruzante',
                'password' => bcrypt('aaron123'),
                'role' => 'Admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'shane@wb.com'],
            [
                'name' => 'Shane Dadulla',
                'password' => bcrypt('shane123'),
                'role' => 'Admin',
            ]
        );

        $this->call(ItemSeeder::class);
    }
}
