<?php

namespace App\Http\Controllers;

use App\Helpers\ReorderHelper;
use App\Models\Item;
use App\Models\Batch;
use App\Models\Alert;
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
     * Get Reorder Alerts
     */
    public function getReorderAlerts(Request $request)
    {
        $resolved = $request->boolean('resolved', false);
        $alerts = Alert::with(['item', 'batch'])
            ->where('alert_type', Alert::TYPE_REORDER)
            ->where('resolved', $resolved)
            ->latest('created_at')
            ->get()
            ->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'item_id' => $alert->item_id,
                    'item_name' => $alert->item?->item_name,
                    'sku' => $alert->item?->sku,
                    'available_qty' => $alert->item?->batches()->sum(\DB::raw('quantity_on_hand - reserved_qty')) ?? 0,
                    'reorder_point' => $alert->item?->reorder_point,
                    'created_at' => $alert->created_at,
                    'resolved' => $alert->resolved,
                ];
            });

        return response()->json($alerts);
    }

    /**
     * Get Expiry Alerts
     */
    public function getExpiryAlerts(Request $request)
    {
        $resolved = $request->boolean('resolved', false);
        $alerts = Alert::with(['item', 'batch'])
            ->where('alert_type', Alert::TYPE_EXPIRY)
            ->where('resolved', $resolved)
            ->latest('created_at')
            ->get()
            ->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'item_id' => $alert->item_id,
                    'lot_number' => $alert->batch?->lot_number,
                    'item_name' => $alert->item?->item_name,
                    'expiry_date' => $alert->batch?->expiry_date,
                    'quantity_on_hand' => $alert->batch?->quantity_on_hand,
                    'created_at' => $alert->created_at,
                    'resolved' => $alert->resolved,
                ];
            });

        return response()->json($alerts);
    }

    /**
     * Check Now: FR-14 Expiry Warnings & FR-19 Seasonal Factors
     */
    public function checkNow(Request $request)
    {
        $expiryWarningsCreated = 0;
        $sfUpdatesApplied = 0;

        // FR-14: Expiry warning check — batches received >= 8 months ago
        $batches = Batch::whereNotNull('expiry_date')
            ->where('received_date', '<=', now()->subMonths(8))
            ->get();

        foreach ($batches as $batch) {
            $exists = Alert::where('batch_id', $batch->id)
                ->where('alert_type', Alert::TYPE_EXPIRY)
                ->where('resolved', false)
                ->exists();

            if (!$exists) {
                Alert::create([
                    'item_id' => $batch->item_id,
                    'batch_id' => $batch->id,
                    'alert_type' => Alert::TYPE_EXPIRY,
                    'resolved' => false,
                ]);
                $expiryWarningsCreated++;
            }
        }

        // FR-19: Seasonal factor recalculation
        $currentSf = ReorderHelper::getSeasonalFactor();
        $seasonalItems = Item::where('is_seasonal', true)->get();
        foreach ($seasonalItems as $item) {
            $item->update(['current_sf' => $currentSf]);
            $sfUpdatesApplied++;
        }

        return response()->json([
            'expiry_warnings_created' => $expiryWarningsCreated,
            'sf_updates_applied' => $sfUpdatesApplied,
        ]);
    }

    /**
     * Resolve Alert
     */
    public function resolveAlert(Request $request, Alert $alert)
    {
        if ($alert->resolved) {
            return response()->json([
                'code' => 'ALREADY_RESOLVED',
                'message' => 'This alert has already been resolved.',
            ], 409);
        }

        $alert->update([
            'resolved' => true,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        return response()->json($alert);
    }

    /**
     * Dashboard Alerts — low stock & soon-expiring items
     */
    public function dashboardAlerts()
    {
        return response()->json([
            'reorder_alerts' => Alert::with('item')->where('alert_type', Alert::TYPE_REORDER)->where('resolved', false)->get(),
            'expiry_warnings' => Alert::with(['item', 'batch'])->where('alert_type', Alert::TYPE_EXPIRY)->where('resolved', false)->get(),
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
