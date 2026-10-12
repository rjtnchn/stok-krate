<?php

namespace App\Services\Reports;

use App\Models\StockTransaction;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Recorded-vs-physical variance, aggregated EXCLUSIVELY from stock_transactions.
 *
 * A manual stock correction is an `adjustment` row whose signed `quantity` is the
 * delta between what the system had RECORDED and what was PHYSICALLY counted:
 *
 *     quantity = physical - recorded      (negative = shrinkage / missing stock)
 *
 * Per batch we therefore report:
 *   adjustment_count   number of adjustment rows
 *   units_lost         sum of |negative deltas|   (physical < recorded)
 *   units_found        sum of positive deltas     (physical > recorded)
 *   net_variance       sum of signed deltas       = units_found - units_lost
 *   units_received     units the system recorded coming in ('add' / 'receipt' rows, all time)
 *   variance_pct       net_variance / units_received * 100 (null if nothing was received)
 *
 * Only type = 'adjustment' rows count. Reservations, fulfilments, cancellations
 * and receipts are never part of the variance (FR-23).
 */
class ShrinkageReportService
{
    /**
     * @return array{rows: Collection<int, object>, summary: array<string, int>}
     */
    public function build(?CarbonInterface $from = null, ?CarbonInterface $to = null): array
    {
        // Correlated sub-select: what the system recorded as received for the batch.
        $received = DB::table('stock_transactions as r')
            ->selectRaw('COALESCE(SUM(r.quantity), 0)')
            ->whereColumn('r.batch_id', 'batches.id')
            ->whereIn('r.type', StockTransaction::RECEIPT_TYPES);

        $rows = DB::table('stock_transactions as t')
            ->join('batches', 'batches.id', '=', 't.batch_id')
            ->join('items', 'items.id', '=', 'batches.item_id')
            ->where('t.type', StockTransaction::TYPE_ADJUSTMENT)
            ->when($from, fn ($q) => $q->where('t.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('t.created_at', '<=', $to))
            ->groupBy('batches.id', 'batches.lot_number', 'items.id', 'items.sku', 'items.item_name')
            ->select([
                'batches.id as batch_id',
                'batches.lot_number',
                'items.id as item_id',
                'items.sku',
                'items.item_name',
            ])
            ->selectRaw('COUNT(*) as adjustment_count')
            ->selectRaw('SUM(CASE WHEN t.quantity < 0 THEN -t.quantity ELSE 0 END) as units_lost')
            ->selectRaw('SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END) as units_found')
            ->selectRaw('SUM(t.quantity) as net_variance')
            ->selectRaw('MAX(t.created_at) as last_adjusted_at')
            ->selectSub($received, 'units_received')
            ->orderBy('net_variance')          // biggest shortage first
            ->orderBy('items.item_name')
            ->orderBy('batches.lot_number')
            ->get()
            ->map(function (object $row): object {
                $row->adjustment_count = (int) $row->adjustment_count;
                $row->units_lost = (int) $row->units_lost;
                $row->units_found = (int) $row->units_found;
                $row->net_variance = (int) $row->net_variance;
                $row->units_received = (int) $row->units_received;
                $row->variance_pct = $row->units_received > 0
                    ? round($row->net_variance / $row->units_received * 100, 2)
                    : null;

                return $row;
            });

        return [
            'rows' => $rows,
            'summary' => [
                'batches_affected' => $rows->count(),
                'items_affected' => $rows->pluck('item_id')->unique()->count(),
                'adjustment_count' => (int) $rows->sum('adjustment_count'),
                'units_lost' => (int) $rows->sum('units_lost'),
                'units_found' => (int) $rows->sum('units_found'),
                'net_variance' => (int) $rows->sum('net_variance'),
            ],
        ];
    }
}
