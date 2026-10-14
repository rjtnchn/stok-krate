<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Order;
use App\Models\StockTransaction;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * FR-22: Stock levels report (one row per batch).
     */
    public function stockLevels(): JsonResponse
    {
        $batches = Batch::with('item')->latest('id')->get()->map(function ($batch) {
            $available = $batch->quantity_on_hand - $batch->reserved_qty;
            return [
                'item_name' => $batch->item?->item_name,
                'sku' => $batch->item?->sku,
                'lot_number' => $batch->lot_number,
                'on_hand' => $batch->quantity_on_hand,
                'reserved' => $batch->reserved_qty,
                'available_qty' => $available,
                'reorder_point' => $batch->item?->reorder_point ?? 0,
                'expiry_date' => $batch->expiry_date,
            ];
        });

        return response()->json($batches);
    }

    /**
     * FR-23: Shrinkage report (adjustments).
     */
    public function shrinkage(): JsonResponse
    {
        $transactions = StockTransaction::with(['batch.item', 'user'])
            ->where('type', 'adjustment')
            ->latest('created_at')
            ->get()
            ->map(function ($tx) {
                return [
                    'id' => $tx->id,
                    'item_name' => $tx->batch?->item?->item_name,
                    'lot_number' => $tx->batch?->lot_number,
                    'user_name' => $tx->user?->name,
                    'quantity' => $tx->quantity,
                    'created_at' => $tx->created_at,
                ];
            });

        return response()->json($transactions);
    }

    /**
     * FR-24: Expiry risk report (lots with expiry dates, sorted by closest expiry).
     */
    public function expiryRisk(): JsonResponse
    {
        $batches = Batch::with('item')
            ->whereNotNull('expiry_date')
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function ($batch) {
                $days = now()->diffInDays($batch->expiry_date, false);
                return [
                    'item_id' => $batch->item_id,
                    'item_name' => $batch->item?->item_name,
                    'lot_number' => $batch->lot_number,
                    'on_hand' => $batch->quantity_on_hand,
                    'expiry_date' => $batch->expiry_date,
                    'days_until_expiry' => (int) $days,
                ];
            });

        return response()->json($batches);
    }

    /**
     * Dashboard summary.
     */
    public function dashboardSummary(): JsonResponse
    {
        return response()->json([
            'total_skus' => Item::count(),
            'total_stock' => Batch::sum('quantity_on_hand'),
            'pending_orders' => Order::where('status', 'pending')->count(),
        ]);
    }

    /**
     * Recent transactions.
     */
    public function recentTransactions(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 10);
        $transactions = StockTransaction::with(['batch.item', 'user'])
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($tx) {
                return [
                    'id' => $tx->id,
                    'item_name' => $tx->batch?->item?->item_name,
                    'lot_number' => $tx->batch?->lot_number,
                    'user_name' => $tx->user?->name,
                    'transaction_type' => $tx->type,
                    'quantity' => $tx->quantity,
                    'created_at' => $tx->created_at,
                ];
            });

        return response()->json($transactions);
    }
}
