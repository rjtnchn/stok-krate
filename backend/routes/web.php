<?php

use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Route::get('/hello/{productPrice}/{quantity}', [ProductController::class, 'show']); 


Route::get('/products/{id}', [ProductController::class, 'show']);
