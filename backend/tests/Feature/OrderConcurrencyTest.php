<?php

namespace Tests\Feature;

use App\Models\Batch;
use App\Models\Item;
use App\Models\Order;
use App\Models\StockTransaction;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * Proves the row locking in OrderService really stops double-reservation and
 * double-deduction.
 *
 * Why this test does not use DatabaseTransactions / RefreshDatabase:
 *   a request running in another OS process can only see COMMITTED rows, and
 *   we need genuinely parallel requests (each with its own MySQL connection)
 *   because PHPUnit's in-process $this->postJson() calls run one after another
 *   and can never race. So test data is committed for real and removed again
 *   in tearDown(), keyed by the ids this test created - nothing else is touched.
 *
 * Requires MySQL/InnoDB (row locks). Skipped on any other driver.
 */
class OrderConcurrencyTest extends TestCase
{
    /** @var list<int> */
    private array $itemIds = [];

    /** @var list<int> */
    private array $userIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('Row-lock concurrency needs MySQL/InnoDB.');
        }
    }

    protected function tearDown(): void
    {
        if (DB::getDriverName() === 'mysql') {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            $batchIds = Batch::whereIn('item_id', $this->itemIds)->pluck('id');

            Order::whereIn('item_id', $this->itemIds)->delete();
            StockTransaction::whereIn('batch_id', $batchIds)->delete();
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $this->userIds)
                ->delete();
            Batch::whereIn('item_id', $this->itemIds)->delete();
            Item::whereIn('id', $this->itemIds)->delete();
            User::whereIn('id', $this->userIds)->delete();
        }

        parent::tearDown();
    }

    // ---------------------------------------------------------------------
    // Trigger 1 - reservation
    // ---------------------------------------------------------------------

    public function test_two_simultaneous_orders_for_the_last_unit_only_one_succeeds(): void
    {
        [$item, $batch] = $this->makeStock(onHand: 1);
        $tokens = [$this->makeUserToken(), $this->makeUserToken()];
        $startAt = microtime(true) + 2.0;

        // Two staff members each order the single remaining unit, same instant.
        $workers = array_map(
            fn (string $token) => $this->spawn($token, 'POST', '/api/orders', [
                'item_id' => $item->id,
                'quantity' => 1,
            ], $startAt),
            $tokens,
        );

        $results = array_map(fn (Process $p) => $this->outcome($p), $workers);
        $statuses = collect($results)->pluck('status')->sort()->values()->all();

        // Exactly one wins (201), the other is refused with a validation-style 422.
        $this->assertSame([201, 422], $statuses, 'Expected exactly one order to succeed. Got: '.json_encode($results));

        $loser = collect($results)->firstWhere('status', 422);
        $this->assertSame('INSUFFICIENT_STOCK', $loser['body']['error']);
        $this->assertSame(0, $loser['body']['available']);
        $this->assertSame(1, $loser['body']['requested']);

        // Database truth: one unit reserved, available_qty is 0 - never negative.
        $batch->refresh();
        $this->assertSame(1, $batch->quantity_on_hand, 'Reserving must not touch quantity_on_hand.');
        $this->assertSame(1, $batch->reserved_qty);
        $this->assertSame(0, $batch->available_qty);
        $this->assertSame(1, Order::where('item_id', $item->id)->count());
        $this->assertSame(1, StockTransaction::where('batch_id', $batch->id)->where('type', 'reservation')->count());
    }

    public function test_a_burst_of_orders_can_never_oversell_the_batch(): void
    {
        [$item, $batch] = $this->makeStock(onHand: 3);
        $startAt = microtime(true) + 3.0;

        // Six people each try to order 1 unit of a batch that only has 3.
        $workers = [];
        for ($i = 0; $i < 6; $i++) {
            $workers[] = $this->spawn($this->makeUserToken(), 'POST', '/api/orders', [
                'item_id' => $item->id,
                'quantity' => 1,
            ], $startAt);
        }

        $results = array_map(fn (Process $p) => $this->outcome($p), $workers);
        $statuses = collect($results)->pluck('status')->countBy()->sortKeys()->all();

        $this->assertSame([201 => 3, 422 => 3], $statuses, 'Got: '.json_encode($results));

        $batch->refresh();
        $this->assertSame(3, $batch->reserved_qty);
        $this->assertSame(0, $batch->available_qty);
        $this->assertSame(3, Order::where('item_id', $item->id)->count());
    }

    /**
     * Deterministic proof that the FEFO query itself takes the row lock.
     *
     * The race tests above depend on timing; this one does not. The test holds
     * FOR UPDATE on the batch row from its own connection and fires an order
     * request. MySQL must then report the request WAITING, and the statement
     * it is waiting with must be the locking SELECT ... FOR UPDATE - not the
     * later UPDATE. (If ->lockForUpdate() were missing, the SELECT would sail
     * through and only the UPDATE would block, which is too late: both
     * requests would already have read the same available_qty.)
     */
    public function test_the_fefo_select_waits_on_a_locked_batch_row(): void
    {
        [$item, $batch] = $this->makeStock(onHand: 5);
        $token = $this->makeUserToken();

        DB::beginTransaction();
        DB::table('batches')->where('id', $batch->id)->lockForUpdate()->first();

        $worker = $this->spawn($token, 'POST', '/api/orders', ['item_id' => $item->id, 'quantity' => 1], microtime(true) + 0.5);

        $waitingQuery = $this->waitForBlockedQuery(15);

        $this->assertNotNull($waitingQuery, 'The order request never blocked on the locked batch row.');
        $this->assertStringStartsWith('select', strtolower(ltrim($waitingQuery)), "Blocked on: {$waitingQuery}");
        $this->assertStringContainsStringIgnoringCase('for update', $waitingQuery, 'The FEFO SELECT must use lockForUpdate().');
        $this->assertTrue($worker->isRunning(), 'Order request finished while the batch row was locked.');

        DB::rollBack(); // release the lock; the waiting request may now proceed

        $result = $this->outcome($worker);
        $this->assertSame(201, $result['status'], json_encode($result));
        $this->assertSame(1, $batch->refresh()->reserved_qty);
    }

    // ---------------------------------------------------------------------
    // Trigger 2 - fulfilment
    // ---------------------------------------------------------------------

    public function test_a_double_scan_at_the_packing_station_deducts_stock_only_once(): void
    {
        [$item, $batch] = $this->makeStock(onHand: 10);
        $user = $this->makeUser();
        $order = app(OrderService::class)->place($user, $item->id, 4);
        $tokens = [$this->tokenFor($user), $this->tokenFor($user)];
        $startAt = microtime(true) + 2.0;

        $workers = array_map(
            fn (string $token) => $this->spawn($token, 'PUT', "/api/orders/{$order->id}/fulfil", [], $startAt),
            $tokens,
        );

        $results = array_map(fn (Process $p) => $this->outcome($p), $workers);

        $this->assertSame([200, 409], collect($results)->pluck('status')->sort()->values()->all(), json_encode($results));
        $this->assertSame('ALREADY_FULFILLED', collect($results)->firstWhere('status', 409)['body']['error']);

        $batch->refresh();
        $this->assertSame(6, $batch->quantity_on_hand, 'Deducted exactly once (10 - 4).');
        $this->assertSame(0, $batch->reserved_qty);
        $this->assertSame(6, $batch->available_qty);
        $this->assertSame(1, StockTransaction::where('batch_id', $batch->id)->where('type', 'fulfillment')->count());
    }

    /**
     * Same deterministic technique for Trigger 2: fulfilling must lock the
     * batch row with SELECT ... FOR UPDATE before it decrements anything, so a
     * fulfilment can't lose an update against a simultaneous reservation.
     */
    public function test_fulfilment_waits_on_a_locked_batch_row_with_a_locking_select(): void
    {
        [$item, $batch] = $this->makeStock(onHand: 10);
        $user = $this->makeUser();
        $order = app(OrderService::class)->place($user, $item->id, 3);
        $token = $this->tokenFor($user);

        DB::beginTransaction();
        DB::table('batches')->where('id', $batch->id)->lockForUpdate()->first();

        $worker = $this->spawn($token, 'PUT', "/api/orders/{$order->id}/fulfil", [], microtime(true) + 0.5);

        $waitingQuery = $this->waitForBlockedQuery(15);

        $this->assertNotNull($waitingQuery, 'The fulfil request never blocked on the locked batch row.');
        $this->assertStringStartsWith('select', strtolower(ltrim($waitingQuery)), "Blocked on: {$waitingQuery}");
        $this->assertStringContainsStringIgnoringCase('for update', $waitingQuery);

        DB::rollBack();

        $result = $this->outcome($worker);
        $this->assertSame(200, $result['status'], json_encode($result));

        $batch->refresh();
        $this->assertSame(7, $batch->quantity_on_hand);
        $this->assertSame(0, $batch->reserved_qty);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /** @return array{0: Item, 1: Batch} */
    private function makeStock(int $onHand): array
    {
        $item = Item::create([
            'sku' => 'CONC-'.uniqid(),
            'item_name' => 'Concurrency Test Item',
            'category' => 'Testing',
            'turnover_category' => 'A',
            'reorder_point' => 0,
        ]);
        $this->itemIds[] = $item->id;

        $batch = $item->batches()->create([
            'lot_number' => 'LOT-CONC-'.uniqid(),
            'quantity_on_hand' => $onHand,
            'reserved_qty' => 0,
            'received_date' => today()->subDays(10),
            'expiry_date' => today()->addMonths(6),
            'last_updated' => now(),
        ]);

        return [$item, $batch];
    }

    private function makeUser(): User
    {
        $user = User::create([
            'name' => 'Concurrency Tester',
            'email' => 'conc_'.uniqid().'@test.ph',
            'role' => 'Staff',
            'password' => bcrypt('password123'),
        ]);
        $this->userIds[] = $user->id;

        return $user;
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('concurrency-test')->plainTextToken;
    }

    private function makeUserToken(): string
    {
        return $this->tokenFor($this->makeUser());
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function spawn(string $token, string $method, string $uri, array $payload, float $startAt): Process
    {
        $db = config('database.connections.mysql');

        $process = new Process(
            [PHP_BINARY, base_path('tests/Support/http_request_worker.php'), $token, $method, $uri, json_encode($payload), (string) $startAt],
            base_path(),
            [
                'APP_ENV' => 'testing',
                'DB_CONNECTION' => 'mysql',
                'DB_URL' => '',
                'DB_HOST' => $db['host'],
                'DB_PORT' => $db['port'],
                'DB_DATABASE' => $db['database'],
                'DB_USERNAME' => $db['username'],
                'DB_PASSWORD' => $db['password'],
                'CACHE_STORE' => 'array',
                'SESSION_DRIVER' => 'array',
                'QUEUE_CONNECTION' => 'sync',
            ],
            timeout: 90,
        );
        $process->start();

        return $process;
    }

    /**
     * @return array{status: int, body: array<string, mixed>, seconds: float}
     */
    private function outcome(Process $process): array
    {
        $process->wait();

        $lines = array_values(array_filter(array_map('trim', explode("\n", $process->getOutput()))));
        $decoded = $lines ? json_decode(end($lines), true) : null;

        $this->assertIsArray($decoded, "Worker produced no result.\nstdout: {$process->getOutput()}\nstderr: {$process->getErrorOutput()}");

        return $decoded;
    }

    /**
     * Polls MySQL's sys.innodb_lock_waits until some statement is blocked on a
     * row lock and returns that statement's SQL (null on timeout).
     */
    private function waitForBlockedQuery(int $timeoutSeconds): ?string
    {
        $deadline = microtime(true) + $timeoutSeconds;

        while (microtime(true) < $deadline) {
            try {
                $row = DB::selectOne('SELECT waiting_query FROM sys.innodb_lock_waits LIMIT 1');
            } catch (\Illuminate\Database\QueryException $e) {
                $this->markTestSkipped('Needs read access to the MySQL sys schema: '.$e->getMessage());
            }

            if ($row !== null) {
                return (string) $row->waiting_query;
            }
            usleep(100_000);
        }

        return null;
    }
}
