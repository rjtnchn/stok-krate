<?php

/**
 * Child process used by OrderConcurrencyTest.
 *
 * Boots the real application and pushes ONE real HTTP request through the HTTP
 * kernel (routing, Sanctum auth, validation, controller, DB) - then prints the
 * outcome as a single JSON line. Running several of these at once gives true
 * parallel requests with separate MySQL connections, which an in-process
 * PHPUnit test cannot do.
 *
 * Usage: php http_request_worker.php <token> <METHOD> <uri> <json-payload> <startAtEpochFloat>
 */

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

[, $token, $method, $uri, $payload, $startAt] = $argv;

require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(Kernel::class);

// Pay the boot + connection cost BEFORE the barrier so that, once the barrier
// drops, the only thing left to race on is the request's own database work.
$kernel->bootstrap();
DB::connection()->getPdo();

$request = Request::create(
    $uri,
    $method,
    json_decode($payload, true) ?: [],
    [],
    [],
    ['HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
);

// Barrier: spin until the agreed instant so every worker fires together.
while (microtime(true) < (float) $startAt) {
    usleep(200);
}

$began = microtime(true);
$response = $kernel->handle($request);

echo "\n".json_encode([
    'status' => $response->getStatusCode(),
    'body' => json_decode($response->getContent(), true),
    'seconds' => round(microtime(true) - $began, 3),
])."\n";
