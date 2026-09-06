<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class ItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminUser = User::where('role', 'Admin')->first() ?? User::first();
        $adminId = $adminUser ? $adminUser->id : 1;

        $itemsData = [
            [
                'item' => [
                    'sku' => 'AC-PORT-15HP',
                    'item_name' => 'Portable AC Unit 1.5 HP Inverter',
                    'category' => 'Cooling Appliances',
                    'turnover_category' => 'A',
                    'is_seasonal' => true,
                    'reorder_point' => 15,
                    'current_sf' => 1.25,
                    'lead_time_days' => 14,
                    'demand_max' => 50,
                    'lead_time_max' => 21,
                ],
                'batches' => [
                    [
                        'lot_number' => 'LOT-AC-2026-001',
                        'quantity_on_hand' => 35,
                        'reserved_qty' => 5,
                        'received_date' => '2026-06-01',
                        'expiry_date' => null,
                        'last_updated' => now()->subDays(60),
                    ],
                    [
                        'lot_number' => 'LOT-AC-2026-002',
                        'quantity_on_hand' => 25,
                        'reserved_qty' => 0,
                        'received_date' => '2026-08-15',
                        'expiry_date' => null,
                        'last_updated' => now()->subDays(20),
                    ],
                ],
            ],
            [
                'item' => [
                    'sku' => 'TH-SMRT-WIFI',
                    'item_name' => 'Smart WiFi Programmable Thermostat',
                    'category' => 'Smart Climate Control',
                    'turnover_category' => 'B',
                    'is_seasonal' => false,
                    'reorder_point' => 20,
                    'current_sf' => 1.00,
                    'lead_time_days' => 7,
                    'demand_max' => 40,
                    'lead_time_max' => 14,
                ],
                'batches' => [
                    [
                        'lot_number' => 'LOT-TH-2026-001',
                        'quantity_on_hand' => 50,
                        'reserved_qty' => 8,
                        'received_date' => '2026-05-10',
                        'expiry_date' => null,
                        'last_updated' => now()->subDays(90),
                    ],
                    [
                        'lot_number' => 'LOT-TH-2026-002',
                        'quantity_on_hand' => 40,
                        'reserved_qty' => 0,
                        'received_date' => '2026-07-20',
                        'expiry_date' => null,
                        'last_updated' => now()->subDays(45),
                    ],
                ],
            ],
            [
                'item' => [
                    'sku' => 'AP-HEPA-45W',
                    'item_name' => 'HEPA Air Purifier Pro 45W',
                    'category' => 'Air Quality',
                    'turnover_category' => 'A',
                    'is_seasonal' => false,
                    'reorder_point' => 25,
                    'current_sf' => 1.10,
                    'lead_time_days' => 10,
                    'demand_max' => 60,
                    'lead_time_max' => 15,
                ],
                'batches' => [
                    [
                        'lot_number' => 'LOT-AP-2026-001',
                        'quantity_on_hand' => 45,
                        'reserved_qty' => 10,
                        'received_date' => '2026-04-12',
                        'expiry_date' => null,
                        'last_updated' => now()->subDays(120),
                    ],
                    [
                        'lot_number' => 'LOT-AP-2026-002',
                        'quantity_on_hand' => 30,
                        'reserved_qty' => 0,
                        'received_date' => '2026-07-05',
                        'expiry_date' => null,
                        'last_updated' => now()->subDays(60),
                    ],
                ],
            ],
            [
                'item' => [
                    'sku' => 'FL-HEPA-REPL',
                    'item_name' => 'True HEPA Replacement Filter Cartridge',
                    'category' => 'Consumables & Filters',
                    'turnover_category' => 'B',
                    'is_seasonal' => false,
                    'reorder_point' => 50,
                    'current_sf' => 1.00,
                    'lead_time_days' => 5,
                    'demand_max' => 100,
                    'lead_time_max' => 10,
                ],
                'batches' => [
                    [
                        'lot_number' => 'LOT-FL-2026-001',
                        'quantity_on_hand' => 120,
                        'reserved_qty' => 15,
                        'received_date' => '2026-03-01',
                        'expiry_date' => '2028-03-01',
                        'last_updated' => now()->subDays(150),
                    ],
                    [
                        'lot_number' => 'LOT-FL-2026-002',
                        'quantity_on_hand' => 80,
                        'reserved_qty' => 0,
                        'received_date' => '2026-06-15',
                        'expiry_date' => '2028-06-15',
                        'last_updated' => now()->subDays(75),
                    ],
                ],
            ],
        ];

        foreach ($itemsData as $data) {
            $item = Item::create($data['item']);

            foreach ($data['batches'] as $batchData) {
                $batch = $item->batches()->create($batchData);

                // Record initial stock transaction
                StockTransaction::recordTransaction(
                    batchId: $batch->id,
                    userId: $adminId,
                    type: 'add',
                    quantity: $batch->quantity_on_hand
                );
            }
        }
    }
}
