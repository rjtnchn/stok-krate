<?php

namespace App\Services\Reports;

use App\Models\Batch;
use App\Models\StockTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * System-wide audit summary shown above the activity log.
 *
 * Everything is derived from the stock_transactions table (there is no separate
 * audit / reconciliation table in the schema). The definitions below are the
 * single place to change if the business wants different semantics:
 *
 *  recorded_vs_physical  totals over ALL `adjustment` rows (physical - recorded).
 *  open_discrepancies    number of batches whose adjustments do not net to zero,
 *                        i.e. recorded stock was corrected away from what the
 *                        system believed and has not been offset by a later,
 *                        opposite correction.
 *  last_full_audit       the moment by which EVERY batch that still holds stock
 *                        (quantity_on_hand > 0) had been physically re-counted at
 *                        least once = the oldest of those batches' latest
 *                        adjustment. NULL if any such batch was never adjusted
 *                        (i.e. no full audit has happened).
 *  last_adjustment_at    timestamp of the most recent adjustment of any batch.
 *  overrides             every `adjustment` is a manual override of the recorded
 *                        quantity; counted overall and per user.
 */
class ActivityAuditSummary
{
    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $adjustments = DB::table('stock_transactions as t')
            ->where('t.type', StockTransaction::TYPE_ADJUSTMENT);

        $totals = (clone $adjustments)
            ->selectRaw('COUNT(*) as adjustment_count')
            ->selectRaw('COALESCE(SUM(CASE WHEN t.quantity < 0 THEN -t.quantity ELSE 0 END), 0) as units_lost')
            ->selectRaw('COALESCE(SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END), 0) as units_found')
            ->selectRaw('COALESCE(SUM(t.quantity), 0) as net_variance')
            ->selectRaw('MAX(t.created_at) as last_adjustment_at')
            ->first();

        $openDiscrepancies = (int) DB::query()
            ->fromSub(
                (clone $adjustments)
                    ->select('t.batch_id')
                    ->groupBy('t.batch_id')
                    ->havingRaw('SUM(t.quantity) <> 0'),
                'open_batches'
            )
            ->count();

        $byUser = (clone $adjustments)
            ->join('users', 'users.id', '=', 't.user_id')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->orderBy('users.name')
            ->get([
                'users.id as user_id',
                'users.name as user_name',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(t.quantity) as net_variance'),
            ])
            ->map(fn (object $r) => [
                'user_id' => (int) $r->user_id,
                'user_name' => $r->user_name,
                'count' => (int) $r->count,
                'net_variance' => (int) $r->net_variance,
            ])
            ->all();

        return [
            'recorded_vs_physical' => [
                'adjustment_count' => (int) $totals->adjustment_count,
                'units_lost' => (int) $totals->units_lost,
                'units_found' => (int) $totals->units_found,
                'net_variance' => (int) $totals->net_variance,
            ],
            'open_discrepancies' => $openDiscrepancies,
            'last_full_audit' => $this->lastFullAudit(),
            'last_adjustment_at' => $totals->last_adjustment_at
                ? Carbon::parse($totals->last_adjustment_at)->toIso8601String()
                : null,
            'overrides' => [
                'count' => (int) $totals->adjustment_count,
                'by_user' => $byUser,
            ],
        ];
    }

    private function lastFullAudit(): ?string
    {
        $latestPerBatch = Batch::query()
            ->where('quantity_on_hand', '>', 0)
            ->selectSub(
                DB::table('stock_transactions as a')
                    ->selectRaw('MAX(a.created_at)')
                    ->whereColumn('a.batch_id', 'batches.id')
                    ->where('a.type', StockTransaction::TYPE_ADJUSTMENT),
                'last_adjusted'
            )
            ->pluck('last_adjusted');

        if ($latestPerBatch->isEmpty() || $latestPerBatch->contains(fn ($value) => $value === null)) {
            return null;
        }

        return Carbon::parse($latestPerBatch->min())->toIso8601String();
    }
}
