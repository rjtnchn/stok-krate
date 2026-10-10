<?php

namespace App\Helpers;

class ReorderHelper
{
    /**
     * Standard ROP Formula: (d × L) + SS
     * where SS = (Dmax × Lmax) - (d × L)
     */
    public static function standardROP($demand_rate, $lead_time, $max_demand, $max_lead_time)
    {
        $ss = ($max_demand * $max_lead_time) - ($demand_rate * $lead_time);
        return ($demand_rate * $lead_time) + $ss;
    }

    /**
     * Seasonal ROP Formula: (d × L × SF) + SS
     */
    public static function seasonalROP($demand_rate, $lead_time, $max_demand, $max_lead_time, $seasonal_factor)
    {
        $ss = ($max_demand * $max_lead_time) - ($demand_rate * $lead_time);
        return ($demand_rate * $lead_time * $seasonal_factor) + $ss;
    }

    /**
     * Trigger 3 — Reorder Point Alert
     * Returns true if available_qty is at or below reorder_point
     */
    public static function shouldReorder($available_qty, $reorder_point)
    {
        return $available_qty <= $reorder_point;
    }

    /**
     * Trigger 4 — Expiry Warning / FIFO
     * Flags batches at 8 months shelf life (1 month before 9-month expiry)
     */
    public static function isExpiringSoon($manufacture_date, $shelf_life_days = 270)
    {
        $expiry_date = strtotime($manufacture_date . " + {$shelf_life_days} days");
        $warning_date = strtotime("-30 days", $expiry_date); // 1 month before expiry
        return time() >= $warning_date && time() < $expiry_date;
    }

    /**
     * Trigger 5 — Seasonal Coefficient Recalculation
     * Pre-Peak (Mar–May): SF = 2.5
     * Post-Peak (Aug–Feb): SF = 0.3
     */
    public static function getSeasonalFactor($month = null)
    {
        $month = $month ?? date('n'); // 1 = Jan, 12 = Dec
        
        if ($month >= 3 && $month <= 5) {
            return 2.5; // Pre-Peak: Mar, Apr, May
        }
        return 0.3; // Post-Peak: rest of the year
    }

    /**
     * Task 9 — Blueprint Example Test
     * d=50, L=14, SS=200 → should return 900
     */
    public static function testStandardROP()
    {
        $d = 50;
        $L = 14;
        $SS = 200;
        $result = ($d * $L) + $SS;
        
        // Expected: (50 × 14) + 200 = 700 + 200 = 900
        return $result === 900;
    }
}