<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportActivityLogRequest;
use App\Http\Requests\ReportExpiryRiskRequest;
use App\Http\Requests\ReportShrinkageRequest;
use App\Http\Requests\ReportStockRequest;
use App\Http\Resources\ExpiryRiskResource;
use App\Http\Resources\ShrinkageResource;
use App\Http\Resources\StockLevelResource;
use App\Http\Resources\TransactionResource;
use App\Models\Alert;
use App\Models\Batch;
use App\Models\Order;
use App\Models\StockTransaction;
use App\Models\Item;
use App\Services\Reports\ActivityAuditSummary;
use App\Services\Reports\ShrinkageReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function stock(ReportStockRequest $request): AnonymousResourceCollection
    {
        $batches = Batch::query()
            ->join('items', 'items.id', '=', 'batches.item_id')
            ->select('batches.*')
            ->with('item')
            ->when($request->validated('category'), fn ($q, $class) => $q->where('items.turnover_category', $class))
            ->orderBy('items.item_name')
            ->orderByRaw('batches.expiry_date IS NULL')
            ->orderBy('batches.expiry_date')
            ->orderBy('batches.lot_number')
            ->get();

        return StockLevelResource::collection($batches)->additional([
            'summary' => [
                'category' => $request->validated('category'),
                'batches' => $batches->count(),
                'total_on_hand' => (int) $batches->sum('quantity_on_hand'),
                'total_reserved' => (int) $batches->sum('reserved_qty'),
                'total_available' => (int) $batches->sum(fn (Batch $b) => $b->available_qty),
            ],
        ]);
    }

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

    public function shrinkage(ReportShrinkageRequest $request, ShrinkageReportService $service): AnonymousResourceCollection
    {
        $report = $service->build(
            from: $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : null,
            to: $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : null,
        );

        return ShrinkageResource::collection($report['rows'])->additional(['summary' => $report['summary']]);
    }

    public function expiryRisks(ReportExpiryRiskRequest $request): AnonymousResourceCollection
    {
        $alerts = Alert::query()
            ->expiryWarnings()
            ->where('alerts.resolved', $request->boolean('resolved'))
            ->join('batches', 'batches.id', '=', 'alerts.batch_id')
            ->select('alerts.*')
            ->with('batch.item')
            ->orderBy('batches.expiry_date')
            ->orderBy('alerts.id')
            ->get();

        return ExpiryRiskResource::collection($alerts)->additional([
            'summary' => [
                'resolved' => $request->boolean('resolved'),
                'count' => $alerts->count(),
            ],
        ]);
    }

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

    public function dashboardSummary(): JsonResponse
    {
        return response()->json([
            'total_skus' => Item::count(),
            'total_stock' => Batch::sum('quantity_on_hand'),
            'pending_orders' => Order::where('status', 'pending')->count(),
        ]);
    }

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

    public function activityLog(ReportActivityLogRequest $request, ActivityAuditSummary $summary): AnonymousResourceCollection
    {
        $direction = $request->input('order', 'desc');

        $transactions = StockTransaction::query()
            ->with(['batch.item', 'user'])
            ->when($request->input('type'), fn ($q, $v) => $q->where('stock_transactions.type', $v))
            ->when($request->input('user_id'), fn ($q, $v) => $q->where('stock_transactions.user_id', $v))
            ->when($request->input('batch_id'), fn ($q, $v) => $q->where('stock_transactions.batch_id', $v))
            ->when($request->input('item_id'), fn ($q, $v) => $q->whereHas('batch', fn ($b) => $b->where('item_id', $v)))
            ->when($request->filled('from'), fn ($q) => $q->where('stock_transactions.created_at', '>=', Carbon::parse($request->input('from'))->startOfDay()))
            ->when($request->filled('to'), fn ($q) => $q->where('stock_transactions.created_at', '<=', Carbon::parse($request->input('to'))->endOfDay()))
            ->orderBy('stock_transactions.created_at', $direction)
            ->orderBy('stock_transactions.id', $direction)
            ->paginate((int) $request->input('per_page', 25))
            ->withQueryString();

        return TransactionResource::collection($transactions)->additional([
            'summary' => $summary->build(),
        ]);
    }
}
