<?php
namespace App\Helpers;

class ReorderHelper
{
    public static function safetyStock($maxDailyUsage, $leadTimeDays)
    {
        return $maxDailyUsage * $leadTimeDays;
    }

    public static function reorderPoint($avgDailyUsage, $leadTimeDays, $safetyStock)
    {
        return ($avgDailyUsage * $leadTimeDays) + $safetyStock;
    }

    public static function eoq($annualDemand, $orderingCost, $holdingCost)
    {
        if ($holdingCost <= 0) return 0;
        return sqrt((2 * $annualDemand * $orderingCost) / $holdingCost);
    }
}