<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\ItemController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Authentication Route
Route::post('/login', [AuthController::class, 'login']);

// Authenticated Routes (Sanctum Protected)
Route::middleware('auth:sanctum')->group(function () {
    // Current User Session
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

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
});
