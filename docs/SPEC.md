# SPEC — stok-krate: WalangBrownout Appliances IMS
> Status: Draft | Version: 1.2 | Date: 2026-08-15
> Source of truth for implementation. Any behavior not covered here is an open question,
> not a green light to assume. Derived from PRD.md and `.kiro/steering/blueprint.md`.

---

## 1. Scope

This spec covers the full backend and frontend implementation of stok-krate: authentication, role-based access, item and batch management, order processing with two-phase stock deduction, FEFO rotation, reorder point alerting (standard and seasonal), expiry warning alerts, reporting, and the admin/staff dashboards. It does not cover POS/payment, barcode hardware, supplier automation, logistics beyond "fulfilled", ML forecasting, or multi-location warehousing.

See `PRD.md` for the product-level problem statement and goals.

---

## 2. Non-Goals

- Payment processing or POS
- Barcode / RFID hardware integration
- Automated supplier purchase orders
- Delivery / logistics tracking beyond order status = `fulfilled`
- ML demand forecasting (Sf is set from historical averages, not predictions)
- Multi-warehouse / multi-location support
- Customer-facing storefront or online channel

---

## 3. Requirements (EARS)

### Authentication & Access Control

| ID | Requirement |
|----|-------------|
| FR-01 | WHEN a user submits a valid email and password THE SYSTEM SHALL create an authenticated session and return the user's role. |
| FR-01b | WHEN a user submits an invalid email or password THE SYSTEM SHALL return a 401 response with error code `INVALID_CREDENTIALS` and shall not create a session. |
| FR-02 | WHEN an unauthenticated request is made to a protected web route THE SYSTEM SHALL redirect to `/login`. |
| FR-02b | WHEN an unauthenticated request is made to a protected API route THE SYSTEM SHALL return 401 with error code `UNAUTHENTICATED`. |
| FR-03 | THE SYSTEM SHALL permit only Admin users to create, deactivate, and update the role of user accounts. |
| FR-04 | WHEN a Staff user requests an Admin-only route or action THE SYSTEM SHALL return 403 with error code `FORBIDDEN`. |

### Item & Batch Management

| ID | Requirement |
|----|-------------|
| FR-05 | THE SYSTEM SHALL allow Admin users to create an item record containing: `sku` (unique), `item_name`, `category`, `turnover_category` (A/B/C), `is_seasonal` (boolean), `reorder_point`, and `current_sf`. |
| FR-05b | IF a submitted `sku` already exists THEN THE SYSTEM SHALL return 422 with field error `sku: already taken`. |
| FR-06 | THE SYSTEM SHALL allow Admin users to create a batch record linked to an existing item, containing: `lot_number`, `quantity_on_hand`, `received_date`, and `expiry_date`. |
| FR-06b | IF `expiry_date` is earlier than or equal to `received_date` THEN THE SYSTEM SHALL return 422 with field error `expiry_date: must be after received_date`. |
| FR-07 | THE SYSTEM SHALL never store `available_qty` as a database column; it SHALL always be computed at query time as `quantity_on_hand − reserved_qty`. |
| FR-08 | WHEN Staff creates a batch record (stock receipt) THE SYSTEM SHALL write a `stock_transactions` row of type `receipt` with `batch_id`, `user_id`, `quantity`, and `created_at`. |

### Order Processing & Stock Deduction

| ID | Requirement |
|----|-------------|
| FR-09 | WHEN an order is placed THE SYSTEM SHALL increment `reserved_qty` on the FEFO-selected batch by the ordered quantity and SHALL NOT change `quantity_on_hand`. |
| FR-10 | WHEN an order status is set to `fulfilled` THE SYSTEM SHALL decrement both `quantity_on_hand` and `reserved_qty` on the reserved batch by the fulfilled quantity. |
| FR-11 | THE SYSTEM SHALL write a `stock_transactions` row for every stock movement: `reservation`, `fulfillment`, `receipt`, `adjustment`, and `cancellation`. Each row SHALL include `batch_id`, `user_id`, `type`, `quantity`, and `created_at`. |
| FR-12 | IF an order reservation quantity exceeds the total `available_qty` across all FEFO-eligible batches for that item THEN THE SYSTEM SHALL return 422 with error code `INSUFFICIENT_STOCK`. |

### FEFO Rotation & Expiry Management

| ID | Requirement |
|----|-------------|
| FR-13 | WHEN reserving stock for an order THE SYSTEM SHALL select the batch with the earliest `expiry_date` among all batches for that item where `(quantity_on_hand − reserved_qty) > 0`. |
| FR-14 | WHEN the current date is ≥ 8 months after a batch's `received_date` AND no unresolved `expiry_warning` alert exists for that batch THE SYSTEM SHALL create an alert of type `expiry_warning` for that batch. This check runs when Admin clicks Check Now (POST /api/alerts/check-now). A Laravel scheduled job may be wired to the same logic in production; for the prototype, the Check Now button is the trigger. |
| FR-15 | THE SYSTEM SHALL provide Admin users a view listing all unresolved `expiry_warning` alerts, showing: `lot_number`, `item_name`, `expiry_date`, `quantity_on_hand`, and `created_at`. |

### Reorder Point Alerts

| ID | Requirement |
|----|-------------|
| FR-16 | THE SYSTEM SHALL compute ROP for non-seasonal items as `(d × L) + SS` where `d` = 30-day rolling average daily demand, `L` = `lead_time_days`, and `SS = (demand_max × lead_time_max) − (d × L)`. |
| FR-17 | THE SYSTEM SHALL compute ROP for seasonal items (`is_seasonal = true`) as `(d × L × current_sf) + SS`. |
| FR-18 | WHEN `available_qty` for an item falls at or below its `reorder_point` AND no unresolved `reorder_alert` exists for that item THE SYSTEM SHALL create an alert of type `reorder_alert`. |
| FR-19 | THE SYSTEM SHALL update `current_sf` for all seasonal items according to the seasonal schedule: March–May → 2.5, August–February → 0.3. This update runs when Admin clicks Check Now (POST /api/alerts/check-now). A Laravel scheduled job may be wired to the same logic in production; for the prototype, the Check Now button is the trigger. |
| FR-20 | THE SYSTEM SHALL provide Admin users a view listing all unresolved `reorder_alert` alerts, showing: `item_name`, `available_qty`, `reorder_point`, and `created_at`. |
| FR-21 | WHEN Admin marks a `reorder_alert` as resolved THE SYSTEM SHALL set `resolved = 1` and record the resolving `user_id` and timestamp. |

### Reporting

| ID | Requirement |
|----|-------------|
| FR-22 | THE SYSTEM SHALL provide Admin users a stock levels report showing per batch: `item_name`, `sku`, `lot_number`, `quantity_on_hand`, `reserved_qty`, computed `available_qty`, and `expiry_date`. |
| FR-23 | THE SYSTEM SHALL provide Admin users a shrinkage discrepancy report listing all `stock_transactions` of type `adjustment`, showing: `item_name`, `lot_number`, `user name`, `quantity` (signed delta), and `created_at`. |
| FR-24 | THE SYSTEM SHALL provide Admin users an expiry risk report listing all batches where `expiry_date` is within 30 days of the current date, sorted ascending by `expiry_date`. |

### Dashboard

| ID | Requirement |
|----|-------------|
| FR-25 | THE SYSTEM SHALL display on the Admin dashboard: count of unresolved `reorder_alert` alerts, count of unresolved `expiry_warning` alerts, total distinct SKUs, and the 10 most recent `stock_transactions`. |
| FR-26 | THE SYSTEM SHALL display on the Staff dashboard: all orders with status `pending`, recent `stock_transactions` created by the authenticated user (last 10), and all unresolved `expiry_warning` alerts. |

---

## 4. Data Models

> `available_qty` is NOT a stored column anywhere. It is always computed as `quantity_on_hand − reserved_qty`.

### `users`
```
id             INT                    PK, auto-increment
name           VARCHAR(100)           not null
email          VARCHAR(100)           not null, unique
password_hash  VARCHAR(255)           not null
role           ENUM('Admin','Staff')  not null, default 'Staff'
created_at     DATETIME               not null, default now()
deactivated_at DATETIME               nullable  — null means active
```

### `items`
```
id                INT           PK, auto-increment
sku               VARCHAR(50)   not null, unique
item_name         VARCHAR(150)  not null
category          VARCHAR(100)  not null
turnover_category CHAR(1)       not null  — 'A', 'B', or 'C'
is_seasonal       TINYINT(1)    not null, default 0
reorder_point     INT           not null, default 0
current_sf        DECIMAL(4,2)  not null, default 1.00
lead_time_days    INT           not null, default 0
demand_max        INT           not null, default 0
lead_time_max     INT           not null, default 0
created_at        DATETIME      not null, default now()
```

### `batches`
```
id               INT          PK, auto-increment
item_id          INT          not null, FK → items.id
lot_number       VARCHAR(50)  not null
                              — unique per item: composite unique key on (item_id, lot_number)
quantity_on_hand INT          not null, default 0
reserved_qty     INT          not null, default 0
received_date    DATE         not null
expiry_date      DATE         nullable  — null for non-perishable items
last_updated     DATETIME     not null, default now(), on update now()
```
> `available_qty` = `quantity_on_hand − reserved_qty` — never stored.

### `orders`
```
id          INT          PK, auto-increment
order_date  DATETIME     not null, default now()
status      VARCHAR(20)  not null  — 'pending', 'fulfilled', 'cancelled'
user_id     INT          not null, FK → users.id  — Staff who created/processes the order
item_id     INT          not null, FK → items.id
batch_id    INT          not null, FK → batches.id
quantity    INT          not null
```

### `stock_transactions`
```
id          INT          PK, auto-increment
batch_id    INT          not null, FK → batches.id
user_id     INT          not null, FK → users.id
type        VARCHAR(20)  not null  — 'receipt', 'reservation', 'fulfillment', 'adjustment', 'cancellation'
quantity    INT          not null  — positive = stock in; negative = stock out
created_at  DATETIME     not null, default now()
```

### `alerts`
```
id          INT          PK, auto-increment
item_id     INT          nullable, FK → items.id   — set for reorder_alert
batch_id    INT          nullable, FK → batches.id — set for expiry_warning
alert_type  VARCHAR(30)  not null  — 'reorder_alert', 'expiry_warning'
resolved    TINYINT(1)   not null, default 0
resolved_by INT          nullable, FK → users.id
resolved_at DATETIME     nullable
created_at  DATETIME     not null, default now()
```

---

## 5. API Contracts

All API routes are prefixed `/api`. Web routes (Blade/React SPA) are separate. Auth uses Laravel session cookies (web guard). All protected routes require an authenticated session; failure returns as described in FR-02b.

### Auth

#### `POST /api/auth/login`
```
Auth:    none
Request: { email: string, password: string }

Response 200: { message: "Logged in", user: { id, name, email, role } }
Response 401: { error: "INVALID_CREDENTIALS" }
Response 422: { errors: { email?: [...], password?: [...] } }  — missing fields
```

#### `POST /api/auth/logout`
```
Auth:    required (any role)
Request: none

Response 200: { message: "Logged out" }
Response 401: { error: "UNAUTHENTICATED" }
```

#### `GET /api/auth/me`
```
Auth:    required (any role)

Response 200: { id, name, email, role }
Response 401: { error: "UNAUTHENTICATED" }
```

---

### Users (Admin only)

#### `GET /api/users`
```
Auth:    Admin

Response 200: [ { id, name, email, role, deactivated_at }, ... ]
Response 403: { error: "FORBIDDEN" }
```

#### `POST /api/users`
```
Auth:    Admin
Request: { name: string, email: string, password: string, role: 'Admin'|'Staff' }

Response 201: { id, name, email, role }
Response 403: { error: "FORBIDDEN" }
Response 422: { errors: { name?, email?, password?, role? } }
```

#### `PUT /api/users/{id}`
```
Auth:    Admin
Request: { name?, email?, role?, deactivated_at? }

Response 200: { id, name, email, role, deactivated_at }
Response 403: { error: "FORBIDDEN" }
Response 403: { error: "SELF_DEACTIVATION_FORBIDDEN" }  — if deactivating own account
Response 404: { error: "NOT_FOUND" }
Response 422: { errors: { ... } }
```

---

### Items (Admin only — write; any authenticated — read)

#### `GET /api/items`
```
Auth:    required (any role)

Response 200: [ { id, sku, item_name, category, turnover_category, is_seasonal,
                  reorder_point, current_sf, lead_time_days, demand_max,
                  lead_time_max }, ... ]
```

#### `POST /api/items`
```
Auth:    Admin
Request: { sku, item_name, category, turnover_category, is_seasonal,
           reorder_point, current_sf, lead_time_days, demand_max, lead_time_max }

Response 201: { id, sku, item_name, ... }
Response 403: { error: "FORBIDDEN" }
Response 422: { errors: { sku?: ["already taken"], ... } }
```

#### `PUT /api/items/{id}`
```
Auth:    Admin
Request: any subset of item fields

Response 200: { id, sku, item_name, ... }
Response 403: { error: "FORBIDDEN" }
Response 404: { error: "NOT_FOUND" }
Response 422: { errors: { ... } }
```

---

### Batches

#### `GET /api/items/{item_id}/batches`
```
Auth:    required (any role)

Response 200: [ { id, lot_number, quantity_on_hand, reserved_qty,
                  available_qty, received_date, expiry_date, last_updated }, ... ]
              — available_qty computed server-side, not stored
Response 404: { error: "NOT_FOUND" }  — if item_id doesn't exist
```

#### `POST /api/items/{item_id}/batches`
```
Auth:    required (any role — Staff creates receipts)
Request: { lot_number, quantity_on_hand, received_date, expiry_date? }

Response 201: { id, item_id, lot_number, quantity_on_hand, reserved_qty: 0,
                available_qty, received_date, expiry_date }
              — also writes stock_transactions row of type 'receipt'
Response 404: { error: "NOT_FOUND" }  — if item_id doesn't exist
Response 422: { errors: { expiry_date?: ["must be after received_date"], ... } }
```

---

### Orders

#### `GET /api/orders`
```
Auth:    required (any role)
         — Admin sees all orders; Staff sees only their own

Response 200: [ { id, order_date, status, user_id, item_id, batch_id, quantity }, ... ]
```

#### `POST /api/orders`
```
Auth:    required (any role)
Request: { item_id: int, quantity: int }
         — batch_id is resolved server-side via FEFO, not supplied by client

Response 201: { id, order_date, status: "pending", user_id, item_id, batch_id, quantity }
              — increments reserved_qty on FEFO-selected batch
              — writes stock_transactions row of type 'reservation'
              — triggers FR-18 reorder alert check
Response 422: { error: "INSUFFICIENT_STOCK",
                detail: { item_id, requested, available } }  — if quantity exceeds available_qty
```

#### `PUT /api/orders/{id}/fulfil`
```
Auth:    required (any role)

Response 200: { id, status: "fulfilled", item_id, batch_id, quantity }
              — decrements quantity_on_hand and reserved_qty on reserved batch
              — writes stock_transactions row of type 'fulfillment'
Response 404: { error: "NOT_FOUND" }
Response 409: { error: "ALREADY_FULFILLED" }  — if status already 'fulfilled'
Response 409: { error: "ORDER_CANCELLED" }    — if status is 'cancelled'
```

#### `PUT /api/orders/{id}/cancel`
```
Auth:    required (any role)

Response 200: { id, status: "cancelled", item_id, batch_id, quantity }
              — releases reserved_qty back to batch (decrements reserved_qty)
              — writes stock_transactions row of type 'cancellation' with negative quantity
Response 404: { error: "NOT_FOUND" }
Response 409: { error: "ALREADY_FULFILLED" }
```

---

### Alerts

#### `GET /api/alerts`
```
Auth:    Admin
Query params: type? ('reorder_alert' | 'expiry_warning'), resolved? (0 | 1)

Response 200: [ { id, alert_type, resolved, created_at,
                  item?: { id, item_name, sku, available_qty, reorder_point },
                  batch?: { id, lot_number, item_name, expiry_date, quantity_on_hand }
                }, ... ]
Response 403: { error: "FORBIDDEN" }
```

#### `PUT /api/alerts/{id}/resolve`
```
Auth:    Admin
Request: none

Response 200: { id, alert_type, resolved: 1, resolved_by, resolved_at }
Response 403: { error: "FORBIDDEN" }
Response 404: { error: "NOT_FOUND" }
Response 409: { error: "ALREADY_RESOLVED" }
```

#### `POST /api/alerts/check-now`
```
Auth:    Admin
Request: none

Response 200: { expiry_warnings_created: int, sf_updates_applied: int }
              — runs the FR-14 expiry warning check across all batches
              — runs the FR-19 Sf recalculation for all seasonal items
Response 403: { error: "FORBIDDEN" }
```

---

### Reports (Admin only)

#### `GET /api/reports/stock-levels`
```
Auth:    Admin

Response 200: [ { item_name, sku, lot_number, quantity_on_hand,
                  reserved_qty, available_qty, expiry_date }, ... ]
Response 403: { error: "FORBIDDEN" }
```

#### `GET /api/reports/shrinkage`
```
Auth:    Admin

Response 200: [ { item_name, lot_number, user_name, quantity, created_at }, ... ]
              — filtered to stock_transactions where type = 'adjustment'
Response 403: { error: "FORBIDDEN" }
```

#### `GET /api/reports/expiry-risk`
```
Auth:    Admin

Response 200: [ { item_name, lot_number, quantity_on_hand, expiry_date,
                  days_until_expiry }, ... ]
              — batches where expiry_date ≤ today + 30 days, sorted asc by expiry_date
Response 403: { error: "FORBIDDEN" }
```

---

### Dashboard

#### `GET /api/dashboard`
```
Auth:    required (any role)
         — response shape differs by role

Admin Response 200: {
  reorder_alert_count:   int,
  expiry_warning_count:  int,
  total_skus:            int,
  recent_transactions:   [ { id, type, quantity, item_name, lot_number,
                              user_name, created_at } ]  — last 10
}

Staff Response 200: {
  pending_orders:        [ { id, order_date, item_id, batch_id, quantity } ],
  recent_transactions:   [ { id, type, quantity, item_name, lot_number,
                              created_at } ]  — last 10, own only
  expiry_warnings:       [ { lot_number, item_name, expiry_date,
                              quantity_on_hand } ]  — all unresolved
}
Response 401: { error: "UNAUTHENTICATED" }
```

---

## 6. Edge Cases & Error Handling

### Auth
- Submitting login with a deactivated account (`deactivated_at` is not null): return 401 `INVALID_CREDENTIALS` — do not reveal the account is deactivated.
- Session cookie tampered / expired: treat as unauthenticated (FR-02b).

### Stock Reservation (FR-09, FR-12, FR-13)
- Order requests quantity that exceeds total `available_qty` for the item: return 422 `INSUFFICIENT_STOCK` — do not partially reserve.
- Concurrent orders racing for the same batch: use a database-level transaction with a row lock on the batch row to prevent double-reservation.
- Order with zero quantity: return 422 field error `quantity: must be greater than 0`.

### Stock Deduction (FR-10)
- Fulfilling an order that was already fulfilled: return 409 `ALREADY_FULFILLED`.
- Fulfilling a cancelled order: return 409 `ORDER_CANCELLED`.
- `reserved_qty` going negative after deduction (data integrity): this should be structurally impossible if FR-09 and FR-10 are implemented correctly, but if detected, log the anomaly and return 500 — do not silently write negative `reserved_qty`.

### FEFO / Expiry (FR-13, FR-14)
- Item with no `expiry_date` (non-perishable): FEFO degrades to FIFO (sort by `received_date` ascending). No `expiry_warning` alert is ever created for such batches.
- Batch where `expiry_date` is already past: treat `available_qty` as 0 for reservation purposes; do not allow stock to be reserved from an expired batch.
- FR-14 check timing: the 8-month expiry check runs when Admin clicks Check Now (POST /api/alerts/check-now); it is not computed inline on every request. A Laravel scheduled job may be wired to the same logic in production; for the prototype, the Check Now button is the trigger.

### Reorder Alerts (FR-16, FR-17, FR-18)
- `available_qty` drops below ROP on fulfillment: the FR-18 check runs immediately after every fulfillment write, inside the same transaction.
- ROP check when an unresolved alert already exists: skip creation — do not create duplicate alerts.
- Item with `lead_time_days = 0` or `demand_max = 0`: `SS` computes to 0; ROP = `d × L`. This is valid — no guard needed beyond ensuring the fields are non-negative integers.
- FR-19 Sf recalculation runs when Admin clicks Check Now (POST /api/alerts/check-now). If Check Now is not triggered, the previous `current_sf` remains in effect — stale Sf is less harmful than a crash. A Laravel scheduled job may be wired to the same logic in production; for the prototype, the Check Now button is the trigger.

### Batch Management (FR-06b)
- `expiry_date` ≤ `received_date`: return 422 as specified.
- `quantity_on_hand` submitted as negative: return 422 field error `quantity_on_hand: must be ≥ 0`.
- Duplicate `lot_number` within the same item: return 422 field error `lot_number: already taken for this item` (composite unique key on `(item_id, lot_number)` enforces this at the DB level).

### User Management (FR-03)
- Admin attempting to deactivate their own account: return 403 with error `SELF_DEACTIVATION_FORBIDDEN`.
- Deactivated user attempting to log in: return 401 `INVALID_CREDENTIALS` (same as wrong password — do not reveal account status).

### Order Cancellation
- A cancelled order releases `reserved_qty` back to the batch and writes a `stock_transactions` row of type `cancellation` with a negative quantity. This keeps cancellations distinct from `adjustment` entries so they do not pollute the shrinkage discrepancy report (FR-23), which filters exclusively on type `adjustment`.

---

## 7. Acceptance Criteria

### FR-01 — Login
```
Given a registered active user with email "staff@wb.com" and password "secret"
When they POST /api/auth/login with those credentials
Then the response is 200 with user.role present
And a session cookie is set

Given the same user submits the wrong password
When they POST /api/auth/login
Then the response is 401 with error "INVALID_CREDENTIALS"
And no session cookie is set
```

### FR-02 — Unauthenticated access
```
Given no authenticated session exists
When a GET request is made to /api/items
Then the response is 401 with error "UNAUTHENTICATED"
```

### FR-03 — Admin user management
```
Given an authenticated Admin user
When they POST /api/users with valid fields
Then the response is 201 and the new user exists in the database

Given an authenticated Staff user
When they POST /api/users
Then the response is 403 with error "FORBIDDEN"
```

### FR-04 — Role enforcement
```
Given an authenticated Staff user
When they request any Admin-only endpoint (e.g. GET /api/reports/stock-levels)
Then the response is 403 with error "FORBIDDEN"
```

### FR-05 — Create item
```
Given an authenticated Admin
When they POST /api/items with a unique SKU and all required fields
Then the response is 201 and the item is retrievable via GET /api/items

Given an Admin submits a SKU that already exists
When they POST /api/items
Then the response is 422 with errors.sku containing "already taken"
```

### FR-06 — Create batch
```
Given an existing item
When Admin POSTs /api/items/{id}/batches with expiry_date after received_date
Then the response is 201 and batch.reserved_qty = 0

Given expiry_date is before received_date
When Admin POSTs /api/items/{id}/batches
Then the response is 422 with errors.expiry_date containing "must be after received_date"
```

### FR-07 — available_qty never stored
```
Given any batch record in the database
When the batches table schema is inspected
Then no column named available_qty exists in the table definition
And every API response that includes available_qty computes it as quantity_on_hand − reserved_qty
```

### FR-08 — Stock receipt transaction log
```
Given an authenticated Staff user
When they POST /api/items/{id}/batches with quantity_on_hand = 50
Then a stock_transactions row exists with type='receipt', quantity=50, and user_id = that Staff user's id
```

### FR-09 — Reservation does not touch quantity_on_hand
```
Given a batch with quantity_on_hand=20 and reserved_qty=0
When an order is placed for quantity=5
Then batch.reserved_qty = 5
And batch.quantity_on_hand = 20 (unchanged)
And a stock_transactions row of type='reservation' with quantity=5 exists
```

### FR-10 — Fulfillment deducts quantity_on_hand
```
Given the order from FR-09 (reserved_qty=5, quantity_on_hand=20)
When PUT /api/orders/{id}/fulfil is called
Then batch.quantity_on_hand = 15
And batch.reserved_qty = 0
And a stock_transactions row of type='fulfillment' with quantity=-5 exists
```

### FR-11 — Audit trail completeness
```
Given any sequence of reservations, fulfillments, receipts, adjustments, and cancellations
When stock_transactions is queried
Then every movement has a corresponding row with non-null batch_id, user_id, type, quantity, and created_at
```

### FR-12 — Insufficient stock
```
Given a batch with available_qty=3
When an order is placed for quantity=5 of that item
Then the response is 422 with error "INSUFFICIENT_STOCK"
And batch.reserved_qty is unchanged
```

### FR-13 — FEFO batch selection
```
Given two batches for the same item:
  Batch A: expiry_date=2026-10-01, available_qty=10
  Batch B: expiry_date=2026-08-01, available_qty=10
When an order is placed for quantity=5
Then Batch B (earlier expiry) is the one with reserved_qty incremented
And Batch A is untouched
```

### FR-14 — Expiry warning at 8 months
```
Given a filter batch received on 2025-12-01 (making today 2026-08-01 = exactly 8 months later)
When Admin clicks Check Now (POST /api/alerts/check-now)
Then an alert of type='expiry_warning' is created for that batch
And clicking Check Now again does not create a duplicate alert
```

### FR-15 — Expiry warning list
```
Given one or more unresolved expiry_warning alerts
When Admin GETs /api/alerts?type=expiry_warning&resolved=0
Then the response includes lot_number, item_name, expiry_date, and quantity_on_hand for each
```

### FR-16 — Standard ROP formula
```
Given a non-seasonal item with d=10, L=7, demand_max=15, lead_time_max=10
When ROP is computed
Then SS = (15×10) − (10×7) = 80
And ROP = (10×7) + 80 = 150
```

### FR-17 — Seasonal ROP formula
```
Given a seasonal item with d=50, L=14, SS=200, current_sf=2.5
When ROP is computed
Then ROP = (50×14×2.5) + 200 = 1950
```

### FR-18 — Reorder alert fires once
```
Given an item whose available_qty drops to or below reorder_point on fulfillment
When the fulfillment is saved
Then exactly one reorder_alert is created for that item
And a second fulfillment that keeps available_qty below ROP does not create a second alert
```

### FR-19 — Seasonal coefficient update
```
Given today is 2026-03-01 (first day of March)
When Admin clicks Check Now (POST /api/alerts/check-now)
Then all items with is_seasonal=1 have current_sf = 2.50

Given today is 2026-08-01 (first day of August)
When Admin clicks Check Now (POST /api/alerts/check-now)
Then all items with is_seasonal=1 have current_sf = 0.30
```

### FR-20 — Reorder alert dashboard view
```
Given one unresolved reorder_alert for "Portable AC Unit"
When Admin GETs /api/alerts?type=reorder_alert&resolved=0
Then the response includes item_name, available_qty, reorder_point, and created_at
```

### FR-21 — Resolve reorder alert
```
Given an unresolved reorder_alert with id=5
When Admin PUTs /api/alerts/5/resolve
Then alert.resolved = 1 and resolved_by = Admin's user_id and resolved_at is not null

Given the same alert is already resolved
When Admin PUTs /api/alerts/5/resolve again
Then the response is 409 with error "ALREADY_RESOLVED"
```

### FR-22 — Stock levels report
```
Given batches exist across multiple items
When Admin GETs /api/reports/stock-levels
Then each row contains item_name, sku, lot_number, quantity_on_hand, reserved_qty,
     available_qty (computed), and expiry_date
And no row contains a stored available_qty column value
```

### FR-23 — Shrinkage report
```
Given a stock_transactions row of type='adjustment' exists
When Admin GETs /api/reports/shrinkage
Then that row appears with user_name, lot_number, item_name, quantity delta, and created_at
And rows of type='reservation', 'fulfillment', or 'cancellation' are NOT included
```

### FR-24 — Expiry risk report
```
Given a batch with expiry_date = today + 20 days and another with expiry_date = today + 45 days
When Admin GETs /api/reports/expiry-risk
Then only the 20-day batch appears
And results are sorted ascending by expiry_date
```

### FR-25 — Admin dashboard data
```
Given 3 unresolved reorder_alerts and 1 unresolved expiry_warning and 12 SKUs
When Admin GETs /api/dashboard
Then reorder_alert_count=3, expiry_warning_count=1, total_skus=12
And recent_transactions contains at most 10 rows
```

### FR-26 — Staff dashboard data
```
Given a Staff user with 2 pending orders and 3 recent transactions
When they GET /api/dashboard
Then pending_orders has 2 entries and recent_transactions has at most 10 of their own entries
And expiry_warnings shows all unresolved expiry alerts (not filtered to their orders)
```

---

## 8. Assumptions

- `available_qty` is always computed at query time, never stored. Any migration adding it as a column is a spec violation.
- FEFO selects by `expiry_date` ascending; ties broken by `received_date` ascending (oldest received first).
- The FR-14 expiry check and FR-19 Sf recalculation both run when Admin clicks Check Now (POST /api/alerts/check-now). A Laravel scheduled job may be wired to the same logic in production; for the prototype, the Check Now button is the trigger.
- Order cancellation releases `reserved_qty` and writes a `cancellation` transaction (not `adjustment`) with a negative quantity to preserve the audit trail without polluting the shrinkage report.
- Passwords are hashed using Laravel's default bcrypt driver.
- The API is consumed by a React SPA served from the same domain; CSRF protection applies to all state-mutating routes via Laravel's session cookie + CSRF token.
- Staff can view all batches and items (read), but can only write batches (stock receipt) and orders.
- All monetary values (e.g. ₱15,000 write-off from blueprint) are for narrative context only — no price or currency field is in scope.
- Only two roles exist: Admin and Staff. Role is stored as an ENUM on `users`; there is no separate `roles` table.

---

## 9. Open Questions

- ✅ **OQ-1** — Resolved: `lead_time_days`, `demand_max`, and `lead_time_max` are added as columns on `items`. See Data Model.
- ✅ **OQ-2** — Resolved by Correction 3: `batch_id` is a column on `orders` directly. The `order_items` table does not exist.
- ✅ **OQ-3** — Resolved: Staff see all unresolved `expiry_warning` alerts. No Staff-to-item assignment table is in scope.
- ✅ **OQ-4** — Resolved: `lot_number` is unique per item. Enforced with a composite unique key on `(item_id, lot_number)` in the batches migration.
- ✅ **OQ-5** — Resolved: Admin self-deactivation is blocked at the controller level. Returns 403 with error `SELF_DEACTIVATION_FORBIDDEN`.

---

## 10. Changelog

- 2026-08-15 — v1.0 initial draft. Derived from PRD.md (FR-01–FR-26) and blueprint.md. Five open questions surfaced and flagged.
- 2026-08-15 — v1.1 five corrections applied: (1) dropped `roles` table, replaced `role_id` with ENUM `role` on `users`; (2) removed June–July Sf bracket from FR-19, leaving only March–May → 2.5 and August–February → 0.3; (3) dropped `order_items` table, merged `item_id`, `batch_id`, `quantity` into `orders` directly; (4) changed cancellation transaction type from `adjustment` to `cancellation` to protect shrinkage report integrity; (5) replaced all scheduled job language with Check Now trigger (POST /api/alerts/check-now). All five open questions resolved.
- 2026-08-15 — v1.2 FR-12 wording aligned with Section 6 edge case: insufficient stock check now correctly references total available_qty across all eligible batches, not a single batch.
