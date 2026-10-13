<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\UpdateItemRequest;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    /**
     * Display a listing of the items.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Item::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('turnover_category')) {
            $query->where('turnover_category', $request->input('turnover_category'));
        }

        if ($request->has('is_seasonal')) {
            $query->where('is_seasonal', $request->boolean('is_seasonal'));
        }

        if ($request->boolean('with_batches') || str_contains((string) $request->input('include'), 'batches')) {
            $query->with('batches');
        }

        $items = $query->latest('id')->get()->map(function ($item) {
            $arr = $item->toArray();
            $arr['name'] = $item->item_name;
            $arr['seasonal_flag'] = (bool) $item->is_seasonal;
            return $arr;
        });

        return response()->json($items);
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(StoreItemRequest $request): JsonResponse
    {
        $item = Item::create($request->validated());
        $arr = $item->toArray();
        $arr['name'] = $item->item_name;
        $arr['seasonal_flag'] = (bool) $item->is_seasonal;

        return response()->json([
            'message' => 'Item created successfully.',
            'data' => $arr,
        ], 201);
    }

    /**
     * Display the specified item with its nested batches.
     */
    public function show(Item $item): JsonResponse
    {
        $item->load('batches');
        $arr = $item->toArray();
        $arr['name'] = $item->item_name;
        $arr['seasonal_flag'] = (bool) $item->is_seasonal;

        return response()->json([
            'data' => $arr,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(UpdateItemRequest $request, Item $item): JsonResponse
    {
        $item->update($request->validated());
        $arr = $item->toArray();
        $arr['name'] = $item->item_name;
        $arr['seasonal_flag'] = (bool) $item->is_seasonal;

        return response()->json([
            'message' => 'Item updated successfully.',
            'data' => $arr,
        ]);
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(Request $request, Item $item): JsonResponse
    {
        $hasActiveStock = $item->batches()->where('quantity_on_hand', '>', 0)->exists();

        if ($hasActiveStock && ! $request->boolean('force')) {
            return response()->json([
                'message' => 'Cannot delete item with active stock batches. Deplete or remove batches first, or specify force=true.',
            ], 409);
        }

        $item->delete();

        return response()->json([
            'message' => 'Item deleted successfully.',
        ], 200);
    }
}
