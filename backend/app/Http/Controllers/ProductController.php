<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function show()
    {
        $productName = 'Sample Product';
        $productPrice = 10000;
        $quantity = 5;

        $totalValue = $productPrice * $quantity;

       $product= [
        'name' => 'Refrigerator',
        'price' => 10000,
        'quantity' => 5,
];

        $totalValue = $product['price'] * $product['quantity'];

        return $totalValue;
    }

     function productLabel($productName) {
        return "Product: " . $productName;
    }

    function calculateInventoryValue($productPrice, $quantity) {
        return $productPrice * $quantity;
    }


}
