<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBatchRequest;
use App\Http\Requests\UpdateBatchRequest;
use App\Models\Batch;
use App\Models\Item;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BatchController extends Controller
{
    /**
     * Get batches for a specific item.
     */
    public function index(Request $request, Item $item): JsonResponse
    {
        $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
        $batches = $item->batches()
            ->with('transactions')
            ->latest('id')
            ->paginate($perPage);

        return response()->json($batches);
    }

    /**
     * Add a new batch under an item.
     */
    public function store(StoreBatchRequest $request, Item $item): JsonResponse
    {
        $batch = DB::transaction(function () use ($request, $item) {
            $data = $request->validated();
            $data['last_updated'] = now();

            /** @var Batch $batch */
            $batch = $item->batches()->create($data);

            if ($batch->quantity_on_hand > 0) {
                StockTransaction::recordTransaction(
                    batchId: $batch->id,
                    userId: $request->user()->id,
                    type: 'add',
                    quantity: $batch->quantity_on_hand
                );
            }

            return $batch;
        });

        $batch->load(['item', 'transactions.user']);

        return response()->json([
            'message' => 'Batch created successfully.',
            'data' => $batch,
        ], 201);
    }

    /**
     * Retrieve a single batch with its item and transaction history.
     */
    public function show(Batch $batch): JsonResponse
    {
        $batch->load(['item', 'transactions.user']);

        return response()->json([
            'data' => $batch,
        ]);
    }

    /**
     * Update batch quantities or dates.
     */
    public function update(UpdateBatchRequest $request, Batch $batch): JsonResponse
    {
        DB::transaction(function () use ($request, $batch) {
            $oldQty = $batch->quantity_on_hand;
            $data = $request->validated();
            $data['last_updated'] = now();

            $batch->update($data);

            if (array_key_exists('quantity_on_hand', $data)) {
                $newQty = (int) $data['quantity_on_hand'];
                $delta = $newQty - $oldQty;

                if ($delta > 0) {
                    StockTransaction::recordTransaction(
                        batchId: $batch->id,
                        userId: $request->user()->id,
                        type: 'add',
                        quantity: $delta
                    );
                } elseif ($delta < 0) {
                    StockTransaction::recordTransaction(
                        batchId: $batch->id,
                        userId: $request->user()->id,
                        type: 'deduct',
                        quantity: abs($delta)
                    );
                }
            }
        });

        $batch->load(['item', 'transactions.user']);

        return response()->json([
            'message' => 'Batch updated successfully.',
            'data' => $batch,
        ]);
    }

    /**
     * Remove a batch.
     */
    public function destroy(Batch $batch): JsonResponse
    {
        if ($batch->reserved_qty > 0) {
            return response()->json([
                'message' => 'Cannot delete batch with active reserved stock.',
            ], 409);
        }

        $batch->delete();

        return response()->json([
            'message' => 'Batch deleted successfully.',
        ], 200);
    }
}
