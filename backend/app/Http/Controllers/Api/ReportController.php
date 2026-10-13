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
use App\Models\StockTransaction;
use App\Services\Reports\ActivityAuditSummary;
use App\Services\Reports\ShrinkageReportService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/**
 * Admin-only reports (Sprint 5). Access is enforced by the `admin` route
 * middleware; every form request re-checks it as a second layer.
 */
class ReportController extends Controller
{
    /**
     * GET /api/reports/stock[?category=A|B|C]
     *
     * One row per batch with computed available_qty. `category` filters on the
     * ABC turnover class of the batch's item.
     */
    public function stock(ReportStockRequest $request): AnonymousResourceCollection
    {
        $batches = Batch::query()
            ->join('items', 'items.id', '=', 'batches.item_id')
            ->select('batches.*')
            ->with('item')
            ->when($request->validated('category'), fn ($q, $class) => $q->where('items.turnover_category', $class))
            ->orderBy('items.item_name')
            ->orderByRaw('batches.expiry_date IS NULL')   // dated batches first, undated last
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

    /**
     * GET /api/reports/shrinkage[?from=&to=]
     *
     * Recorded-vs-physical variance aggregated from `adjustment` rows only.
     */
    public function shrinkage(ReportShrinkageRequest $request, ShrinkageReportService $service): AnonymousResourceCollection
    {
        $report = $service->build(
            from: $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : null,
            to: $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : null,
        );

        return ShrinkageResource::collection($report['rows'])->additional(['summary' => $report['summary']]);
    }

    /**
     * GET /api/reports/expiry-risks[?resolved=0|1]
     *
     * Sourced exclusively from the alerts table (`expiry_warning` rows), soonest
     * expiry first. Unresolved warnings by default.
     */
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

    /**
     * GET /api/reports/activity-log
     *
     * Paginated audit trail from stock_transactions (newest first by default).
     * Filters: type, user_id, item_id, batch_id, from, to, order, per_page.
     * `summary` is system-wide and is not affected by filters or pagination.
     */
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
            ->orderBy('stock_transactions.id', $direction)   // stable tie-break
            ->paginate((int) $request->input('per_page', 25))
            ->withQueryString();

        return TransactionResource::collection($transactions)->additional([
            'summary' => $summary->build(),
        ]);
    }
}
