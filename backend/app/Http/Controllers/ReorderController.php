<?php
namespace App\Http\Controllers;

use App\Helpers\ReorderHelper;
use Illuminate\Http\Request;

class ReorderController extends Controller
{
    public function calculate(Request $request)
    {
        $maxDaily = $request->max_daily_usage;
        $avgDaily = $request->avg_daily_usage;
        $leadTime = $request->lead_time_days;
        $sf = $request->current_sf ?? 1.0; // default 1.0

        $safetyStock = ReorderHelper::calculateSafetyStock($maxDaily, $leadTime);
        $standardROP = ReorderHelper::calculateROP($avgDaily, $leadTime, $safetyStock);
        $seasonalROP = ReorderHelper::calculateSeasonalROP($avgDaily, $leadTime, $sf, $safetyStock);

        return response()->json([
            'safety_stock' => $safetyStock,
            'standard_rop' => $standardROP,
            'seasonal_rop' => $seasonalROP
        ]);
    }
}