<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function show($id)
    {
        return Item::find($id);
    }

    function productLabel($productName)
    {
        return "Product: " . $productName;
    }

    function calculateInventoryValue($productPrice, $quantity)
    {
        return $productPrice * $quantity;
    }
}
