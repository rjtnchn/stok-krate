<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\FulfillmentController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Authentication Routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Authenticated Routes (Sanctum Protected)
Route::middleware('auth:sanctum')->group(function () {
    // Current User Session
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Items Endpoints
    Route::get('/items', [ItemController::class, 'index']);
    Route::get('/items/{item}', [ItemController::class, 'show']);

    Route::middleware('role:Admin')->group(function () {
        Route::post('/items', [ItemController::class, 'store']);
        Route::match(['put', 'patch'], '/items/{item}', [ItemController::class, 'update']);
        Route::delete('/items/{item}', [ItemController::class, 'destroy']);
    });

    // Batches Endpoints
    Route::get('/items/{item}/batches', [BatchController::class, 'index']);
    Route::post('/items/{item}/batches', [BatchController::class, 'store']);
    Route::get('/batches/{batch}', [BatchController::class, 'show']);
    Route::get('/items/{item}/batches/{batch}', [BatchController::class, 'show']);
    Route::match(['put', 'patch'], '/batches/{batch}', [BatchController::class, 'update']);

    Route::middleware('role:Admin')->group(function () {
        Route::delete('/batches/{batch}', [BatchController::class, 'destroy']);
    });

    // Orders (Sprint 3) - any authenticated role
    Route::get('/orders', [OrderController::class, 'index']);                  // Admin: all, Staff: own
    Route::post('/orders', [OrderController::class, 'store']);                 // Trigger 1: reserve (FEFO)
    Route::put('/orders/{order}/confirm', [OrderController::class, 'confirm'])->whereNumber('order'); // pending -> confirmed
    Route::put('/orders/{order}/fulfil', FulfillmentController::class)->whereNumber('order'); // Trigger 2: deduct
    Route::put('/orders/{order}/cancel', [OrderController::class, 'cancel'])->whereNumber('order'); // release reservation
});