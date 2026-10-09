use App\Http\Controllers\ReorderController;

Route::post('/reorder-calculate', [ReorderController::class, 'calculate']);