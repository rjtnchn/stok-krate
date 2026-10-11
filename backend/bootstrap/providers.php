<?php

use App\Providers\AppServiceProvider;
use Laravel\Sanctum\SanctumServiceProvider;

return [
    AppServiceProvider::class,
    // Registered explicitly: bootstrap/cache/packages.php is a generated file and
    // when it goes stale, auto-discovery silently skips Sanctum and the `sanctum`
    // auth driver disappears.
    SanctumServiceProvider::class,
];
