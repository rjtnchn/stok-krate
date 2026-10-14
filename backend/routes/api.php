<?php

use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\FulfillmentController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\ReorderController;
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
    Route::get('/orders', [OrderController::class, 'index']);              // Admin: all, Staff: own
    Route::post('/orders', [OrderController::class, 'store']);             // Trigger 1: reserve (FEFO)
    Route::put('/orders/{order}/confirm', [OrderController::class, 'confirm'])->whereNumber('order'); // pending -> confirmed
    Route::put('/orders/{order}/fulfil', FulfillmentController::class)->whereNumber('order'); // Trigger 2: deduct
    Route::put('/orders/{order}/cancel', [OrderController::class, 'cancel'])->whereNumber('order'); // release reservation

    // (Sprint 4) - Reorder & Seasonal ROP Calculations & Alerts
    Route::post('/rop/standard', [ReorderController::class, 'calculateStandard']);
    Route::post('/rop/seasonal', [ReorderController::class, 'calculateSeasonal']);
    Route::get('/alerts/dashboard', [ReorderController::class, 'dashboardAlerts']);
    Route::get('/seasonal-factor', [ReorderController::class, 'getSeasonalFactor']);
    Route::get('/alerts/reorder', [ReorderController::class, 'getReorderAlerts']);
    Route::get('/alerts/expiry', [ReorderController::class, 'getExpiryAlerts']);
    Route::middleware('admin')->group(function () {
        Route::post('/alerts/check-now', [ReorderController::class, 'checkNow']);
        Route::put('/alerts/{alert}/resolve', [ReorderController::class, 'resolveAlert']);
        Route::get('/reports/stock', [ReportController::class, 'stock']);
        Route::get('/reports/stock-levels', [ReportController::class, 'stockLevels']);
        Route::get('/reports/shrinkage', [ReportController::class, 'shrinkage']);
        Route::get('/reports/expiry-risks', [ReportController::class, 'expiryRisks']);
        Route::get('/reports/expiry-risk', [ReportController::class, 'expiryRisk']);
        Route::get('/reports/activity-log', [ReportController::class, 'activityLog']);
        Route::get('/reports/dashboard-summary', [ReportController::class, 'dashboardSummary']);
        Route::get('/reports/recent-transactions', [ReportController::class, 'recentTransactions']);
        Route::apiResource('/admin/users', UserController::class);
    });
});