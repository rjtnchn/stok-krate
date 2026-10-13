<?php

namespace App\Http\Controllers;

use App\Helpers\ReorderHelper;
use App\Models\Item;
use App\Models\Batch;
use Illuminate\Http\Request;

class ReorderController extends Controller
{
    /**
     * Calculate Standard ROP
     */
    public function calculateStandard(Request $request)
    {
        $d = $request->input('demand_rate');
        $L = $request->input('lead_time');
        $Dmax = $request->input('max_demand');
        $Lmax = $request->input('max_lead_time');
        
        $rop = ReorderHelper::standardROP($d, $L, $Dmax, $Lmax);
        
        return response()->json([
            'rop' => $rop,
            'formula' => "(d×L) + SS where SS = (Dmax×Lmax) - (d×L)"
        ]);
    }

    /**
     * Calculate Seasonal ROP
     */
    public function calculateSeasonal(Request $request)
    {
        $d = $request->input('demand_rate');
        $L = $request->input('lead_time');
        $Dmax = $request->input('max_demand');
        $Lmax = $request->input('max_lead_time');
        $sf = $request->input('seasonal_factor');
        
        $rop = ReorderHelper::seasonalROP($d, $L, $Dmax, $Lmax, $sf);
        
        return response()->json([
            'rop' => $rop,
            'seasonal_factor' => $sf,
            'formula' => "(d×L×SF) + SS"
        ]);
    }

    /**
     * Dashboard Alerts — low stock & soon-expiring items
     */
    public function dashboardAlerts()
    {
        // Low stock alerts
        $lowStockItems = Item::whereColumn('available_qty', '<=', 'reorder_point')
            ->select('id', 'name', 'available_qty', 'reorder_point')
            ->get();

        // Expiring soon batches
        $expiringBatches = Batch::all()->filter(function ($batch) {
            return ReorderHelper::isExpiringSoon($batch->manufacture_date);
        });

        return response()->json([
            'low_stock_alerts' => $lowStockItems,
            'expiring_soon_alerts' => $expiringBatches->values(),
            'total_alerts' => $lowStockItems->count() + $expiringBatches->count()
        ]);
    }

    /**
     * Get current seasonal factor
     */
    public function getSeasonalFactor()
    {
        $sf = ReorderHelper::getSeasonalFactor();
        return response()->json([
            'seasonal_factor' => $sf,
            'month' => date('n')
        ]);
    }
}