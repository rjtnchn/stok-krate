# Sprint Plan — stok-krate: WalangBrownout Appliances IMS
> Derived from: SPEC.md v1.2 | Date: 2026-08-15
> Every task traces to a requirement ID. Tasks without one are marked SETUP.

---

## Team

| Tag | Role | Name |
|-----|------|------|
| Lead | Architecture, review, Q&A prep | _(fill in)_ |
| BD1 | Backend Dev 1 | _(fill in)_ |
| BD2 | Backend Dev 2 | _(fill in)_ |
| FD1 | Frontend Dev 1 | _(fill in)_ |
| FD2 | Frontend Dev 2 | _(fill in)_ |

**Status tags:** `[ ]` todo · `[/]` WIP · `✅` done

---

## Overview

| Sprint | Goal | FR Coverage | Demoable After? |
|--------|------|-------------|-----------------|
| 1 | Foundation — migrations, models, auth | FR-01, FR-01b, FR-02, FR-02b, FR-03, FR-04 | Login + role gate visible |
| 2 | Items & Batches | FR-05, FR-05b, FR-06, FR-06b, FR-07, FR-08 | Admin creates items; Staff receives stock |
| 3 | Orders & Stock Deduction | FR-09, FR-10, FR-11, FR-12, FR-13, FR-18 (inline) | Full order lifecycle; shrinkage fix visible |
| 4 | Alerts | FR-14, FR-15, FR-16, FR-17, FR-18 (full), FR-19, FR-20, FR-21 | Check Now fires reorder + expiry alerts |
| 5 | Reports & Dashboard | FR-22, FR-23, FR-24, FR-25, FR-26 | All reports + both dashboards populated |
| 6 | Polish, Seeding & Demo Prep | All P0 FRs observable | All 3 case studies walkable end-to-end |

> **Defensible floor:** The system is demonstrable after Sprint 3 alone (auth, items, batches, full order lifecycle, stock deduction, audit trail).

---

## Sprint 1 — Foundation

**Goal:** All migrations run cleanly, all Eloquent models exist with relationships, auth works end-to-end, login page is live, and role middleware is enforced.

**FR coverage:** FR-01, FR-01b, FR-02, FR-02b, FR-03, FR-04

---

#### Backend Tasks

1. `[✅]` Create `users` migration — SETUP — **BD1** 
   - Columns: `id`, `name`, `email` (unique), `password_hash`, `role ENUM('Admin','Staff') default 'Staff'`, `created_at`, `deactivated_at` (nullable)
   - Verify `role_id` column does NOT exist (spec constraint)

2. `[✅]` Create `items` migration — SETUP — **BD2** 
   - Columns: `id`, `sku` (unique), `item_name`, `category`, `turnover_category CHAR(1)`, `is_seasonal TINYINT(1) default 0`, `reorder_point INT default 0`, `current_sf DECIMAL(4,2) default 1.00`, `lead_time_days INT default 0`, `demand_max INT default 0`, `lead_time_max INT default 0`, `created_at`

3. `[✅]` Create `batches` migration — SETUP — **BD1** 
   - Columns: `id`, `item_id FK → items.id`, `lot_number VARCHAR(50)`, `quantity_on_hand INT default 0`, `reserved_qty INT default 0`, `received_date DATE`, `expiry_date DATE nullable`, `last_updated DATETIME`
   - Composite unique key on `(item_id, lot_number)`
   - Confirm: NO `available_qty` column

4. `[✅]` Create `orders` migration — SETUP — **BD2** 
   - Columns: `id`, `order_date DATETIME`, `status VARCHAR(20)`, `user_id FK → users.id`, `item_id FK → items.id`, `batch_id FK → batches.id`, `quantity INT`
   - Confirm: NO `order_items` table

5. `[✅]` Create `alerts` migration — SETUP — **BD1** 
   - Columns: `id`, `item_id INT nullable FK → items.id`, `batch_id INT nullable FK → batches.id`, `alert_type VARCHAR(30)`, `resolved TINYINT(1) default 0`, `resolved_by INT nullable FK → users.id`, `resolved_at DATETIME nullable`, `created_at`

6. `[✅]` Create `stock_transactions` migration — SETUP — **BD2** 
   - Columns: `id`, `batch_id FK → batches.id`, `user_id FK → users.id`, `type VARCHAR(20)`, `quantity INT`, `created_at`
   - Valid types: `receipt`, `reservation`, `fulfillment`, `adjustment`, `cancellation`   

7. `[ / ]` Create `User` Eloquent model — SETUP — **BD1** 
   - `$fillable`: name, email, password_hash, role, deactivated_at
   - `$hidden`: password_hash
   - Accessor: `isAdmin()` helper returning `$this->role === 'Admin'`
   - Relationships: `hasMany(Order::class)`, `hasMany(StockTransaction::class)`

8. `[ / ]` Create `Item` Eloquent model — SETUP — **BD2** 
   - `$fillable`: all item fields
   - Relationships: `hasMany(Batch::class)`, `hasMany(Order::class)`, `hasMany(Alert::class)`

9. `[ / ]` Create `Batch` Eloquent model with `available_qty` accessor — FR-07 — **BD1** 
   - `$fillable`: item_id, lot_number, quantity_on_hand, reserved_qty, received_date, expiry_date
   - Accessor: `getAvailableQtyAttribute()` returns `$this->quantity_on_hand - $this->reserved_qty`
   - Confirm: no `available_qty` in `$fillable` and no migration column
   - Relationships: `belongsTo(Item::class)`, `hasMany(StockTransaction::class)`, `hasMany(Alert::class)`

10. `[ / ]` Create `Order`, `StockTransaction`, `Alert` Eloquent models — SETUP — **BD2** 
    - `Order`: `$fillable` all columns; `belongsTo(User::class)`, `belongsTo(Item::class)`, `belongsTo(Batch::class)`
    - `StockTransaction`: `$fillable` all columns; immutable (override `save()` to block updates if `$this->exists`)
    - `Alert`: `$fillable` all columns; `belongsTo(Item::class)`, `belongsTo(Batch::class)`, `belongsTo(User::class, 'resolved_by')`

11. `[ ]` Implement Laravel session auth — FR-01, FR-01b — **BD1** 
    - `POST /api/auth/login`: validate email + password, check `deactivated_at` is null, return `{ message, user: { id, name, email, role } }` or 401 `INVALID_CREDENTIALS`
    - `POST /api/auth/logout`: invalidate session, return 200
    - `GET /api/auth/me`: return authenticated user shape

12. `[ ]` Create `AdminMiddleware` — FR-03, FR-04 — **BD2** 
    - Checks `auth()->user()->role === 'Admin'`; returns 403 `FORBIDDEN` if not
    - Register in `bootstrap/app.php` as `admin` alias

13. `[ ]` Protect all routes requiring auth — FR-02, FR-02b — **BD1** 
    - Apply Laravel `auth` middleware to all `/api/*` routes except login
    - Web routes redirect to `/login` on unauthenticated access; API routes return 401 `UNAUTHENTICATED`

14. `[ ]` Seed Admin and Staff users — SETUP — **BD2** 
    - `DatabaseSeeder`: 1 Admin (`admin@wb.com`), 1 Staff (`staff@wb.com`), hashed passwords via `bcrypt()`

---

#### Frontend Tasks

1. `[ ]` Set up React + Vite project inside `frontend/` — SETUP — **FD1** 
   - Install Tailwind CSS, configure `vite.config.js`
   - Set up `axios` with base URL and `withCredentials: true` for CSRF

2. `[ ]` Set up Blade shell and Bootstrap for non-SPA pages — SETUP — **FD2** 
   - `layouts/app.blade.php` with Bootstrap 5 nav skeleton
   - `/login` Blade route that loads the React SPA mount point

3. `[ ]` Build login form (React) — FR-01, FR-01b — **FD1** 
   - Email + password fields, submit calls `POST /api/auth/login`
   - On 401: display "Invalid credentials" inline error
   - On 200: store role in React context, redirect to `/dashboard`

4. `[ ]` Build role-based route guard (React Router) — FR-02, FR-04 — **FD2** 
   - `<ProtectedRoute>` component: calls `GET /api/auth/me` on mount
   - Redirects to `/login` if unauthenticated
   - Renders 403 message if role does not match required role prop

5. `[ ]` Build basic nav shell — SETUP — **FD1** 
   - Top nav with role label and logout button
   - Logout calls `POST /api/auth/logout`, clears context, redirects to `/login`

---

#### Lead Tasks

1. `[ ]` Review all 6 migrations before first `php artisan migrate` — SETUP — **Lead** 
   - Confirm migration order matches spec: users → items → batches → orders → alerts → stock_transactions
   - Confirm no `available_qty` column, no `roles` table, no `order_items` table
   - Confirm `orders` has `item_id`, `batch_id`, `quantity` columns directly

2. `[ ]` Review `Batch` model `available_qty` accessor — FR-07 — **Lead** — 1 hr
   - Verify accessor is the only place this value is computed
   - Verify it is not in `$fillable`, not in any migration

3. `[ ]` Auth route testing pass — FR-01, FR-02, FR-04 — **Lead** 
   - Manual test: login success, login failure, unauthenticated API call (401), Staff hitting admin route (403)

**Sprint total:**  backend,  frontend, lead.

**Dependency note:** Nothing. Sprint 1 is the foundation — all other sprints depend on it.

---

## Sprint 2 — Items & Batches

**Goal:** Admin can create and update items; Staff and Admin can receive stock (create batches); available_qty is visible in every batch API response; all receipts are logged to stock_transactions.

**FR coverage:** FR-05, FR-05b, FR-06, FR-06b, FR-07, FR-08

---

#### Backend Tasks

1. `[ ]` Implement `GET /api/items` — FR-05 — **BD1** 
   - Return all items with all fields including `lead_time_days`, `demand_max`, `lead_time_max`
   - Auth: any authenticated user

2. `[ ]` Implement `POST /api/items` — FR-05, FR-05b — **BD2** 
   - Admin only (apply `admin` middleware)
   - Validate all required fields; unique SKU check returns 422 `{ errors: { sku: ["already taken"] } }`
   - Return 201 with created item

3. `[ ]` Implement `PUT /api/items/{id}` — FR-05 — **BD1** 
   - Admin only
   - Partial update of any item fields
   - Return 404 `NOT_FOUND` if item does not exist

4. `[ ]` Implement `GET /api/items/{item_id}/batches` — FR-07 — **BD2** 
   - Auth: any authenticated user
   - Each batch in response includes computed `available_qty` (from accessor — never from a column)
   - Return 404 if `item_id` does not exist

5. `[ ]` Implement `POST /api/items/{item_id}/batches` — FR-06, FR-06b, FR-08 — **BD1** 
   - Auth: any authenticated user (Staff creates receipts)
   - Validate: `expiry_date` must be after `received_date`; `quantity_on_hand` must be ≥ 0; `lot_number` unique per item
   - On success: create batch with `reserved_qty = 0`, write `stock_transactions` row `type='receipt'`, `quantity = quantity_on_hand`, `user_id = auth()->id()`
   - Return 201 with batch including computed `available_qty`

6. `[ ]` Write `ItemRequest` and `BatchRequest` form request classes — FR-05b, FR-06b — **BD2** 
   - `ItemRequest`: rules for all item fields, custom message for SKU uniqueness
   - `BatchRequest`: rules for batch fields, custom message for expiry/received date order and lot_number uniqueness per item

---

#### Frontend Tasks

1. `[ ]` Build Items list page (Admin view) — FR-05 — **FD1** 
   - Table of all items fetched from `GET /api/items`
   - Columns: SKU, name, category, turnover category, seasonal flag, reorder point, Sf

2. `[ ]` Build Create Item form (Admin only) — FR-05, FR-05b — **FD2** 
   - Form fields matching `POST /api/items` request body
   - Inline validation errors including "already taken" for SKU
   - On 201: refresh items list

3. `[ ]` Build Edit Item form (Admin only) — FR-05 — **FD1** 
   - Pre-populated form for `PUT /api/items/{id}`
   - Show 404 message if item not found

4. `[ ]` Build Batches list view per item — FR-07 — **FD2** 
   - Nested under item detail: table of batches
   - Columns: lot number, quantity on hand, reserved qty, available qty (computed), received date, expiry date
   - `available_qty` labeled clearly as "(computed)" in UI

5. `[ ]` Build Receive Stock form (Staff + Admin) — FR-06, FR-06b, FR-08 — **FD1** 
   - Form calls `POST /api/items/{item_id}/batches`
   - Inline errors for: expiry before received date, duplicate lot number, negative quantity
   - On 201: refresh batches list; show confirmation with transaction type "receipt" logged

---

#### Lead Tasks

1. `[ ]` Review `POST /api/items/{item_id}/batches` implementation — FR-06, FR-07, FR-08 — **Lead** 
   - Confirm `available_qty` is not written to DB anywhere in this flow
   - Confirm `stock_transactions` row is always written atomically with batch creation
   - Confirm `reserved_qty` starts at 0 on every new batch

2. `[ ]` Review composite unique constraint on `(item_id, lot_number)` — FR-06b — **Lead** — 1 hr
   - Confirm migration has the constraint and application-level validation matches it

**Sprint total:**  backend,  frontend, lead.

**Dependency note:** Sprint 1 must be complete. All models and migrations must exist and seed must run.

---

## Sprint 3 — Orders & Stock Deduction

**Goal:** Full order lifecycle is implemented — placing an order reserves stock only (quantity_on_hand unchanged); fulfillment atomically deducts both fields; cancellation releases reserved_qty with a cancellation transaction; every movement is logged; FR-18 reorder check fires inline after fulfillment.

**FR coverage:** FR-09, FR-10, FR-11, FR-12, FR-13, FR-18 (inline check only)

---

#### Backend Tasks

1. `[ ]` Implement FEFO batch selector service — FR-13 — **BD1** 
   - `FefoBatchSelector::select(int $itemId, int $qty): Batch`
   - Query: `WHERE item_id = ? AND (expiry_date IS NULL OR expiry_date >= today) AND (quantity_on_hand - reserved_qty) > 0 ORDER BY (expiry_date IS NULL), expiry_date ASC, received_date ASC`
   - Note: `NULLS LAST` is PostgreSQL/Oracle syntax and will throw a syntax error in MySQL 8.0. The `(expiry_date IS NULL)` expression sorts `0` (not null) before `1` (null), placing non-perishable batches last — which is the correct FEFO-degrades-to-FIFO behavior defined in SPEC Section 6.
   - If total available across all eligible batches < requested qty: throw `InsufficientStockException`
   - This class is the single place FEFO logic lives — no duplication in controllers

2. `[ ]` Implement `POST /api/orders` — FR-09, FR-12, FR-13 — **BD2** 
   - Wrap entirely in `DB::transaction()` with `lockForUpdate()` on selected batch
   - Call `FefoBatchSelector::select()` — catch `InsufficientStockException`, return 422 `{ error: "INSUFFICIENT_STOCK", detail: { item_id, requested, available } }`
   - On success: increment `batch.reserved_qty`, do NOT touch `quantity_on_hand`
   - Write `stock_transactions` row `type='reservation'`, `quantity = +qty`, `user_id = auth()->id()`
   - Create order with `status='pending'`, `item_id`, `batch_id`, `quantity`
   - After transaction commits: call inline FR-18 reorder check (see task 5)
   - Return 201

3. `[ ]` Implement `PUT /api/orders/{id}/fulfil` — FR-10, FR-11 — **BD1** 
   - Wrap in `DB::transaction()` with `lockForUpdate()` on batch
   - Guard: if `status = 'fulfilled'` return 409 `ALREADY_FULFILLED`; if `status = 'cancelled'` return 409 `ORDER_CANCELLED`
   - Decrement `batch.quantity_on_hand` by order quantity
   - Decrement `batch.reserved_qty` by order quantity
   - Guard: if either would go negative, log anomaly and return 500 — do not write negative values
   - Write `stock_transactions` row `type='fulfillment'`, `quantity = -qty`, `user_id = auth()->id()`
   - Set `order.status = 'fulfilled'`
   - After transaction commits: call inline FR-18 reorder check
   - Return 200

4. `[ ]` Implement `PUT /api/orders/{id}/cancel` — FR-11 — **BD2** 
   - Guard: if `status = 'fulfilled'` return 409 `ALREADY_FULFILLED`
   - Wrap in `DB::transaction()` with `lockForUpdate()` on batch
   - Decrement `batch.reserved_qty` by order quantity
   - Write `stock_transactions` row `type='cancellation'`, `quantity = -qty`, `user_id = auth()->id()`
   - Set `order.status = 'cancelled'`
   - Return 200
   - Confirm: type is `cancellation` NOT `adjustment` (protects FR-23 shrinkage report)

5. `[ ]` Implement inline FR-18 reorder alert check — FR-18 — **BD1** 
   - `ReorderAlertService::checkItem(int $itemId): void`
   - Compute total `available_qty` for item across all non-expired batches
   - Load `item.reorder_point`
   - If `available_qty <= reorder_point` AND no unresolved `reorder_alert` exists for this item: create `alerts` row `{ item_id, alert_type='reorder_alert', resolved=0 }`
   - Called from: `POST /api/orders` and `PUT /api/orders/{id}/fulfil` after their transactions commit

6. `[ ]` Implement `GET /api/orders` — FR-09 — **BD2** 
   - Admin: all orders; Staff: only their own (filter by `user_id = auth()->id()`)
   - Response: `{ id, order_date, status, user_id, item_id, batch_id, quantity }`

---

#### Frontend Tasks

1. `[ ]` Build Place Order form — FR-09, FR-12, FR-13 — **FD1** 
   - Item selector (dropdown from `GET /api/items`) and quantity field
   - Calls `POST /api/orders`
   - On 422 `INSUFFICIENT_STOCK`: display "Not enough stock available (available: X, requested: Y)"
   - On 201: show confirmation with order ID and status "pending"

2. `[ ]` Build Orders list page — FR-09 — **FD2** 
   - Table of orders from `GET /api/orders`
   - Columns: order ID, date, item name, batch lot number, quantity, status
   - Admin sees all; Staff sees own only (API handles filtering)

3. `[ ]` Build Fulfil order action — FR-10, FR-11 — **FD1** 
   - Fulfil button on pending order row calls `PUT /api/orders/{id}/fulfil`
   - On 200: update row status to "fulfilled" in UI
   - On 409: display appropriate error message
   - Show quantity_on_hand change visibly (reload batch data after fulfil)

4. `[ ]` Build Cancel order action — FR-11 — **FD2** 
   - Cancel button on pending order row calls `PUT /api/orders/{id}/cancel`
   - On 200: update row status to "cancelled"
   - On 409: display appropriate error message

5. `[ ]` Add stock quantity refresh after fulfil/cancel — FR-09, FR-10 — **FD1** 
   - After fulfil or cancel, refetch `GET /api/items/{item_id}/batches` for affected item
   - Update batch row in UI to reflect new `quantity_on_hand`, `reserved_qty`, `available_qty`

---

#### Lead Tasks

1. `[ ]` Review FEFO selector and transaction logic — FR-09, FR-13 — **Lead** 
   - Confirm `lockForUpdate()` is present on batch fetch inside transaction
   - Confirm `quantity_on_hand` is NOT touched on order placement — only `reserved_qty` changes
   - Confirm `quantity_on_hand` decrements on fulfillment — not before

2. `[ ]` Review FR-18 inline check — FR-18 — **Lead** — 1 hr
   - Confirm check fires after both `POST /api/orders` and `PUT /api/orders/{id}/fulfil`
   - Confirm duplicate alert is not created when one unresolved alert already exists

3. `[ ]` Manual walkthrough: Mystery Shrinkage demo scenario — FR-09, FR-10, FR-11 — **Lead** 
   - Place order → verify `quantity_on_hand` unchanged, `reserved_qty` incremented
   - Fulfil order → verify both fields decrement
   - Verify `stock_transactions` has reservation row + fulfillment row, both with correct `user_id`

**Sprint total:**  backend,  frontend, lead.

**Dependency note:** Sprint 2 must be complete. Items and batches must exist in the DB. `Batch` model with `available_qty` accessor must be tested and working.

---

## Sprint 4 — Alerts

**Goal:** The Check Now button triggers expiry warning evaluation (FR-14) and seasonal factor recalculation (FR-19); reorder alerts are fully deduplicated (FR-18); Admin can list and resolve alerts.

**FR coverage:** FR-14, FR-15, FR-16, FR-17, FR-18 (full deduplication), FR-19, FR-20, FR-21

---

#### Backend Tasks

1. `[ ]` Implement ROP calculation service (non-seasonal) — FR-16 — **BD1** 
   - `RopService::computeStandardRop(Item $item): int`
   - `d` = average daily demand from last 30 days of `stock_transactions` where `type='fulfillment'` for that item's batches
   - `SS = (demand_max × lead_time_max) - (d × lead_time_days)`
   - `ROP = (d × lead_time_days) + SS`
   - Return computed ROP as integer

2. `[ ]` Implement ROP calculation service (seasonal) — FR-17 — **BD2** 
   - `RopService::computeSeasonalRop(Item $item): int`
   - `ROP = (d × lead_time_days × current_sf) + SS`
   - Branches on `item->is_seasonal`: calls seasonal formula if true, standard if false
   - Update `item->reorder_point` with computed value before alert check

3. `[ ]` Implement expiry warning check — FR-14 — **BD1** 
   - `ExpiryAlertService::run(): int` (returns count of new alerts created)
   - For each batch where `expiry_date IS NOT NULL` and `received_date <= today - 8 months`:
     - If no unresolved `expiry_warning` alert exists for this batch: create one
   - Exclude batches where `expiry_date < today` (already expired — too late)
   - Return count of newly created alerts

4. `[ ]` Implement seasonal factor recalculation — FR-19 — **BD2** 
   - `SfRecalculationService::run(): int` (returns count of items updated)
   - Determine current month; apply: months 3–5 → 2.5, months 8–2 → 0.3
   - Update `current_sf` on all items where `is_seasonal = 1`
   - Return count of updated items

5. `[ ]` Implement `POST /api/alerts/check-now` — FR-14, FR-19 — **BD1** 
   - Admin only
   - Call `ExpiryAlertService::run()` and `SfRecalculationService::run()` in sequence
   - Return 200 `{ expiry_warnings_created: int, sf_updates_applied: int }`

6. `[ ]` Implement `GET /api/alerts` — FR-15, FR-20 — **BD2** 
   - Admin only
   - Query params: `type` (optional), `resolved` (optional, 0 or 1)
   - For `reorder_alert`: eager-load item (`id`, `item_name`, `sku`, computed `available_qty`, `reorder_point`)
   - For `expiry_warning`: eager-load batch (`id`, `lot_number`, item_name via batch→item, `expiry_date`, `quantity_on_hand`)
   - Return array of alert objects

7. `[ ]` Implement `PUT /api/alerts/{id}/resolve` — FR-21 — **BD1** 
   - Admin only
   - Guard: if `resolved = 1` return 409 `ALREADY_RESOLVED`
   - Set `resolved = 1`, `resolved_by = auth()->id()`, `resolved_at = now()`
   - Return 200 with updated alert

8. `[ ]` Finalize FR-18 deduplication — FR-18 — **BD2** 
   - Audit `ReorderAlertService::checkItem()` from Sprint 3
   - Add explicit test: if existing unresolved `reorder_alert` for `item_id` exists, skip insert
   - Confirm the check uses `available_qty` across all non-expired batches (not a single batch)

---

#### Frontend Tasks

1. `[ ]` Build Check Now button (Admin dashboard) — FR-14, FR-19 — **FD1** 
   - Button calls `POST /api/alerts/check-now`
   - On 200: show toast/banner "X expiry warnings created, Y seasonal factors updated"
   - Reload alerts list after response

2. `[ ]` Build Alerts list page (Admin) — FR-15, FR-20 — **FD2** 
   - Tabbed view: "Reorder Alerts" and "Expiry Warnings"
   - Reorder Alerts tab: item name, SKU, available qty, reorder point, created at
   - Expiry Warnings tab: lot number, item name, expiry date, quantity on hand, created at
   - Both tabs show only unresolved alerts by default (resolved=0 query param)

3. `[ ]` Build Resolve alert action — FR-21 — **FD1** 
   - Resolve button on each alert row calls `PUT /api/alerts/{id}/resolve`
   - On 200: remove row from unresolved list (or mark resolved)
   - On 409 `ALREADY_RESOLVED`: show inline message

4. `[ ]` Build Reorder Alert detail display — FR-20 — **FD2** 
   - Each reorder alert row shows current `available_qty` vs `reorder_point`
   - Visual indicator (e.g. red badge) when `available_qty` is critically low

5. `[ ]` Build Expiry Warning detail display — FR-15 — **FD1** 
   - Each expiry warning row shows days until expiry (computed client-side from `expiry_date`)
   - Sort by nearest expiry date first in the UI

---

#### Lead Tasks

1. `[ ]` Review ROP services — FR-16, FR-17 — **Lead** 
   - Verify `d` is computed from `stock_transactions` (type=fulfillment), not invented
   - Verify seasonal vs non-seasonal branching is correct
   - Spot-check formula: `d=10, L=7, demand_max=15, lead_time_max=10 → SS=80, ROP=150`

2. `[ ]` Review expiry check and Sf recalculation — FR-14, FR-19 — **Lead** 
   - Confirm 8-month boundary uses `received_date` (not `expiry_date`)
   - Confirm Sf schedule: months 3–5 = 2.5, months 8–2 = 0.3 (no June–July bracket)
   - Confirm no cron dependency — logic is only triggered by `POST /api/alerts/check-now`

3. `[ ]` Manual walkthrough: Summer Crunch demo scenario — FR-17, FR-18, FR-19 — **Lead** 
   - Set AC Unit batch low, click Check Now, verify reorder alert appears with correct Sf applied

**Sprint total:**  backend,  frontend, lead.

**Dependency note:** Sprint 3 must be complete. `stock_transactions` must contain fulfillment rows for `d` calculation. `ReorderAlertService` from Sprint 3 must exist.

---

## Sprint 5 — Reports & Dashboard

**Goal:** All three Admin reports return correct data; Admin and Staff dashboards return correct response shapes; shrinkage report contains only `adjustment` type transactions (not cancellations).

**FR coverage:** FR-22, FR-23, FR-24, FR-25, FR-26

---

#### Backend Tasks

1. `[ ]` Implement `GET /api/reports/stock-levels` — FR-22 — **BD1** 
   - Admin only
   - Join batches → items
   - Each row: `item_name`, `sku`, `lot_number`, `quantity_on_hand`, `reserved_qty`, `available_qty` (computed in PHP from accessor or raw SQL expression), `expiry_date`
   - Confirm: `available_qty` in response is computed, not a column value

2. `[ ]` Implement `GET /api/reports/shrinkage` — FR-23 — **BD2** 
   - Admin only
   - Filter `stock_transactions` where `type = 'adjustment'` ONLY
   - Confirm: `type = 'cancellation'` rows are excluded
   - Join → batches → items, join → users
   - Each row: `item_name`, `lot_number`, `user_name`, `quantity` (signed delta), `created_at`

3. `[ ]` Implement `GET /api/reports/expiry-risk` — FR-24 — **BD1** 
   - Admin only
   - Filter batches where `expiry_date IS NOT NULL` and `expiry_date <= today + 30 days`
   - Order by `expiry_date ASC`
   - Each row: `item_name`, `lot_number`, `quantity_on_hand`, `expiry_date`, `days_until_expiry` (computed as `expiry_date - today`)

4. `[ ]` Implement `GET /api/dashboard` — Admin shape — FR-25 — **BD2** 
   - Auth: Admin
   - `reorder_alert_count`: count of alerts where `alert_type='reorder_alert'` and `resolved=0`
   - `expiry_warning_count`: count of alerts where `alert_type='expiry_warning'` and `resolved=0`
   - `total_skus`: count of distinct SKUs in items table
   - `recent_transactions`: last 10 `stock_transactions` with `id`, `type`, `quantity`, item_name (via batch→item), `lot_number`, user name, `created_at`

5. `[ ]` Implement `GET /api/dashboard` — Staff shape — FR-26 — **BD1** 
   - Auth: Staff (same route, branches on `auth()->user()->role`)
   - `pending_orders`: all orders where `status='pending'`
   - `recent_transactions`: last 10 `stock_transactions` where `user_id = auth()->id()`
   - `expiry_warnings`: all unresolved `expiry_warning` alerts with `lot_number`, `item_name`, `expiry_date`, `quantity_on_hand`

6. `[ ]` Resource/collection classes for report responses — SETUP — **BD2** 
   - Create Laravel API Resource classes: `StockLevelResource`, `ShrinkageResource`, `ExpiryRiskResource`, `TransactionResource`

---

#### Frontend Tasks

1. `[ ]` Build Stock Levels report page (Admin) — FR-22 — **FD1** 
   - Table from `GET /api/reports/stock-levels`
   - Columns: item name, SKU, lot number, on hand, reserved, available (labeled "computed"), expiry date
   - Highlight rows where `available_qty <= reorder_point`

2. `[ ]` Build Shrinkage report page (Admin) — FR-23 — **FD2** 
   - Table from `GET /api/reports/shrinkage`
   - Columns: item name, lot number, user, quantity delta (show sign), timestamp
   - Note in UI: "Cancellations are excluded from this report"

3. `[ ]` Build Expiry Risk report page (Admin) — FR-24 — **FD1** 
   - Table from `GET /api/reports/expiry-risk`
   - Columns: item name, lot number, on hand, expiry date, days until expiry
   - Highlight rows where `days_until_expiry <= 7` in red

4. `[ ]` Build Admin dashboard page — FR-25 — **FD2** 
   - Summary cards: active reorder alerts count, active expiry warnings count, total SKUs
   - Recent transactions table (last 10 rows)
   - Check Now button wired up (from Sprint 4 component)
   - Quick links to reports and alerts pages

5. `[ ]` Build Staff dashboard page — FR-26 — **FD1** 
   - Pending orders table with fulfil/cancel actions wired (from Sprint 3 components)
   - My recent transactions table (last 10)
   - Active expiry warnings table (all unresolved)

---

#### Lead Tasks

1. `[ ]` Review shrinkage report exclusion — FR-23 — **Lead** — 1 hr
   - Confirm `type='cancellation'` rows are NOT in response
   - Confirm `type='adjustment'` rows ARE in response

2. `[ ]` Review dashboard shapes for both roles — FR-25, FR-26 — **Lead** 
   - Confirm Admin and Staff get different response shapes from same endpoint
   - Confirm Staff `pending_orders` shows all pending (not just their own)
   - Confirm `available_qty` in stock-levels report is computed, not a stored column

3. `[ ]` Full API smoke test pass — SETUP — **Lead** 
   - Run through all endpoints added in Sprints 1–5
   - Document any response shape mismatches against SPEC v1.2 for Sprint 6 fixes

**Sprint total:**  backend,  frontend, lead.

**Dependency note:** Sprints 1–4 must be complete. `stock_transactions` must contain rows of all types. At least one unresolved alert of each type must exist in seed data for reports to be testable.

---

## Sprint 6 — Polish, Seeding & Demo Prep

**Goal:** The system is demo-ready with a comprehensive seed, all three case studies are walkable end-to-end through the UI, and the frontend is fully connected to all backend endpoints.

**FR coverage:** All P0 requirements observable through UI without error.

---

#### Backend Tasks

1. `[ ]` Build comprehensive DatabaseSeeder — SETUP — **BD1** 
   - 1 Admin (`admin@wb.com`), 1 Staff (`staff@wb.com`)
   - 3 items: "Portable AC Unit" (A, seasonal, sf=2.5, rop=900), "Smart Thermostat" (A, non-seasonal, rop=50), "Air Purifier Filter" (C, non-seasonal, rop=30)
   - 5 batches in varying states (AC Unit normal, AC Unit low stock, Thermostat low, Filter near-expiry, Filter fresh)
   - 3 orders: 1 pending, 1 fulfilled, 1 cancelled
   - 2 alerts: 1 unresolved `reorder_alert` (thermostat), 1 unresolved `expiry_warning` (near-expiry filter batch)
   - Matching `stock_transactions` rows for all seeded movements

2. `[ ]` Write demo reset instructions — SETUP — **BD2** — 1 hr
   - Document `php artisan migrate:fresh --seed` as the demo reset command
   - Confirm seed is idempotent via `updateOrCreate`

3. `[ ]` Fix Sprint 1–5 backend issues (part 1) — SETUP — **BD1** 
   - Address response shape mismatches from Lead smoke test log

4. `[ ]` Fix Sprint 1–5 backend issues (part 2) — SETUP — **BD2** 
   - Address remaining bugs; confirm all locked architectural decisions hold

---

#### Frontend Tasks

1. `[ ]` Connect remaining unwired pages to live API (part 1) — SETUP — **FD1** 
   - Replace any mock/static data with live API calls; confirm CSRF token on all mutations

2. `[ ]` Connect remaining unwired pages to live API (part 2) — SETUP — **FD2** 
   - Complete audit; confirm role-gated pages redirect correctly for wrong role

3. `[ ]` End-to-end: Summer Crunch walkthrough — FR-17, FR-18, FR-19 — **FD1** 
   - UI flow: view AC Unit batches (low stock) → click Check Now → reorder alert appears → Admin resolves

4. `[ ]` End-to-end: Mystery Shrinkage walkthrough — FR-09, FR-10, FR-11 — **FD2** 
   - UI flow: Staff places order → `quantity_on_hand` unchanged, `reserved_qty` incremented → Staff fulfils → both decrement → transactions log shows both rows

5. `[ ]` End-to-end: Expiry Trap walkthrough — FR-13, FR-14, FR-15 — **FD1** 
   - UI flow: Admin clicks Check Now → expiry warning appears → place order → FEFO selects near-expiry batch

6. `[ ]` UI polish — form feedback, loading states, error messages — SETUP — **FD2** 
   - All forms show loading spinner; all 4xx/5xx show user-readable messages; empty state messages for all tables

---

#### Lead Tasks

1. `[ ]` Full end-to-end demo rehearsal — SETUP — **Lead** 
   - Run `php artisan migrate:fresh --seed`
   - Walk all three case studies in sequence: Summer Crunch → Mystery Shrinkage → Expiry Trap

2. `[ ]` Panel Q&A prep — SETUP — **Lead** 
   - "Why ENUM instead of a roles table?" — "Why is available_qty not stored?" — "Why two-phase deduction?" — "Why cancellation not adjustment?" — "Why no cron?"

3. `[ ]` Final SPEC v1.2 compliance check — SETUP — **Lead** 
   - Verify no `available_qty` column, no `roles` table, no `order_items` table
   - Verify `stock_transactions.type` includes `cancellation`
   - Verify `POST /api/alerts/check-now` exists and returns correct shape


---

## Changelog

- 2026-08-15 — v1.0 initial sprint plan. Derived from SPEC.md v1.2. Six one-week sprints. Defensible demo floor at Sprint 3.
- 2026-08-15 — v1.1 Sprint 3 Backend Task 1: replaced `ORDER BY expiry_date ASC NULLS LAST` with MySQL 8.0-compatible `ORDER BY (expiry_date IS NULL), expiry_date ASC, received_date ASC`. `NULLS LAST` is PostgreSQL/Oracle syntax and throws a syntax error in MySQL.
- 2026-08-15 — v1.2 Added status tags (`[ ]` todo · `[/]` WIP · `[✓]` done) to every task. Added Team section with name fields. Owner tags bolded on every task line for visibility.
