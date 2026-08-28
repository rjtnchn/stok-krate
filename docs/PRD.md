# PRD — stok-krate: WalangBrownout Appliances Inventory Management System
> Status: Draft | Date: 2026-08-15

---

## 1. Problem Statement

WalangBrownout Appliances manages inventory through a single, manually updated spreadsheet. This produces three documented, recurring failures:

- **Summer Crunch** — AC units stock out in June because reorder decisions are reactive. By the time a reorder is placed, lead time has already created a gap; overcorrection then floods the warehouse through winter.
- **Mystery Shrinkage** — Recorded stock diverges silently from physical stock (the spreadsheet showed 45 thermostats; the warehouse had 12) because sales are batched into the spreadsheet weekly rather than deducted in real time.
- **Expiry Trap** — ₱15,000 in air purifier filters were discarded because staff pick newest stock first and no batch-level expiry dates are tracked, so aging stock is never flagged before it expires.

All three failures share the same root cause: inventory data is static, manual, and too stale to act on. stok-krate replaces the spreadsheet with a web-based system that makes stock movements real-time, batch-tracked, and alert-driven.

---

## 2. Goals

- Eliminate the recorded-vs-physical stock gap by deducting stock only on confirmed physical departure, not at order entry.
- Prevent peak-season stockouts and off-season overstock by automating a seasonal reorder point formula for AC units.
- Stop filter write-offs by enforcing FEFO (First-Expired, First-Out) rotation with expiry warnings at 8 months of shelf life.
- Provide Admin and Staff with role-appropriate views so each role sees and acts on exactly what it needs.

---

## 3. Non-Goals

These are explicitly out of scope per the blueprint and will not be built:

- Point-of-sale / payment processing — the system records movements, it does not process transactions.
- Barcode/RFID hardware integration — stock is updated through the web UI; scanning is a future enhancement.
- Supplier ordering automation — the system raises an alert; the Admin places the actual order manually.
- Delivery and logistics tracking beyond "packed" status.
- Demand forecasting via machine learning — seasonal coefficients (Sf) come from prior-year monthly averages, not predictive models.
- Multi-location warehouse support — the system assumes a single store/warehouse.
- Customer-facing storefront or online sales channel — the blueprint flags the "online channel" wording as a source quirk; no customer UI, payment gateway, or e-commerce layer is being built.

---

## 4. Target Users

**Admin** — full dashboard access: manages items and batches, reviews reports, resolves alerts, configures reorder parameters, and manages user accounts.

**Staff** — operational access: records stock-in (goods received), processes orders (reservation → fulfillment scan), and views their own transaction history. Cannot access reports, user management, or ROP configuration.

---

## 5. Functional Requirements

### Authentication & Access Control

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | A user can log in with email and password and receives a session tied to their role (Admin or Staff). | P0 |
| FR-02 | An unauthenticated request to any protected route returns a redirect to the login page (web) or 401 (API). | P0 |
| FR-03 | Admin users can create, deactivate, and assign roles to user accounts. Staff cannot. | P0 |
| FR-04 | A Staff user attempting to access an Admin-only page or action receives a 403 response. | P0 |

### Item & Batch Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-05 | Admin can create an item record with: SKU, item name, category, turnover category (A/B/C), `is_seasonal` flag, reorder point, and `current_sf`. | P0 |
| FR-06 | Admin can create a batch against an existing item with: lot number, `quantity_on_hand`, `received_date`, and `expiry_date`. | P0 |
| FR-07 | `available_qty` is always derived as `quantity_on_hand − reserved_qty` and is never stored as an independent column. | P0 |
| FR-08 | Staff can receive new stock by creating a batch record; the action is logged to `stock_transactions` with their `user_id`. | P0 |

### Order Processing & Stock Deduction (Mystery Shrinkage Fix)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-09 | When an order is placed, the system reserves the required quantity on the oldest FEFO-eligible batch by incrementing `reserved_qty`. `quantity_on_hand` is not changed at this point. | P0 |
| FR-10 | When an order is marked fulfilled (packing confirmed), the system deducts the quantity from both `quantity_on_hand` and `reserved_qty` on the reserved batch. This is the only moment physical stock is deducted. | P0 |
| FR-11 | Every stock movement (reservation, fulfillment, receipt, manual adjustment) writes a row to `stock_transactions` with `batch_id`, `user_id`, `type`, `quantity`, and `created_at`. | P0 |
| FR-12 | The system prevents an order reservation from exceeding `available_qty`; attempting to do so returns a validation error. | P0 |

### FEFO Rotation & Expiry Management (Expiry Trap Fix)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-13 | When reserving stock for an order, the system always selects the batch with the nearest `expiry_date` among batches with `available_qty > 0` (FEFO). | P0 |
| FR-14 | When a batch's age reaches 8 months from `received_date` (1 month before the 9-month filter expiry), the system creates an alert of type `expiry_warning` and marks that batch as the priority pick. | P0 |
| FR-15 | Admin can view a list of all active expiry warnings, showing lot number, item, expiry date, and remaining quantity. | P0 |

### Reorder Point Alerts (Summer Crunch Fix)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-16 | For non-seasonal items (Thermostats, Purifiers, Filters), the system computes ROP as `(d × L) + SS`, where `d` is 30-day rolling average daily demand, `L` is supplier lead time in days, and `SS = (Dmax × Lmax) − (d × L)`. | P0 |
| FR-17 | For seasonal items (`is_seasonal = true`, i.e. Portable AC Units), the system computes ROP as `(d × L × Sf) + SS`, using the item's `current_sf`. | P0 |
| FR-18 | When `available_qty` falls at or below `reorder_point`, the system creates a `reorder_alert` for that item. Duplicate alerts for the same item are not created if one is already unresolved. | P0 |
| FR-19 | `current_sf` is recalculated monthly according to the seasonal schedule: 2.5 for March–May (pre-peak), and 0.3 for August–February (post-peak). | P0 |
| FR-20 | Admin can view all active reorder alerts on the dashboard, showing item name, current `available_qty`, `reorder_point`, and alert creation time. | P0 |
| FR-21 | Admin can mark a reorder alert as resolved (after a purchase order has been placed manually). | P1 |

### Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-22 | Admin can view a stock levels report showing all items with their current `available_qty`, `reserved_qty`, and `quantity_on_hand` per batch. | P0 |
| FR-23 | Admin can view a shrinkage discrepancy report listing manual stock adjustments (transaction type `adjustment`) with the user, quantity delta, and timestamp. | P1 |
| FR-24 | Admin can view an expiry risk report listing all batches with an `expiry_date` within 30 days, sorted by nearest expiry first. | P1 |

### Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-25 | The Admin dashboard displays: count of active reorder alerts, count of active expiry warnings, total SKUs, and a summary of recent stock transactions. | P0 |
| FR-26 | The Staff view displays: pending orders assigned to them, recent transactions they logged, and active expiry warnings for items they handle. | P1 |

---

## 6. Non-Functional Requirements

**Stack (fixed by blueprint):** Laravel (PHP) backend, MySQL database, React + Bootstrap frontend. These are not up for negotiation — they match the graded architecture.

**Single location:** All stock logic assumes one warehouse. Multi-location is a future enhancement.

**Role enforcement:** Every backend route and action must check the authenticated user's role server-side. Frontend role-gating is UX convenience only and is not a security control.

**Audit completeness:** No stock quantity change — reservation, fulfillment, receipt, or adjustment — may occur without a corresponding `stock_transactions` row. This is the structural fix for Mystery Shrinkage and must hold even if a bulk operation is run.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Staff bypass — staff don't record physical movements, so `quantity_on_hand` drifts from reality anyway | The audit trail (FR-11) makes gaps visible; the Admin shrinkage report (FR-23) surfaces them. Detection, not prevention — acknowledged limitation per blueprint. |
| First-year seasonal coefficients are estimates | Sf values are seeded from prior-year averages per blueprint. Flag in the UI that new-SKU Sf values are estimates until 12 months of data exist. |
| `available_qty` derived-only rule silently violated | FR-07 is a hard architectural constraint. A migration that adds an `available_qty` column would be a spec violation — call it out in code review. |
| Blueprint "online channel" wording | Blueprint flags this itself. The system has no customer storefront. If a panel question arises, the answer is: the blueprint wording is a source quirk; the built system is single-channel (internal staff only). |

---

## 8. Success Metrics

Success is evaluated against the three case studies, not invented KPIs:

- **Summer Crunch resolved** — a demo can show a Portable AC Unit's ROP alert firing before `available_qty` hits zero, with `current_sf` visibly changing between pre-peak and post-peak months (FR-17, FR-18, FR-19).
- **Mystery Shrinkage resolved** — a demo can show that placing an order does not change `quantity_on_hand`, only `reserved_qty`, and that `quantity_on_hand` decreases only on fulfillment confirmation (FR-09, FR-10); the `stock_transactions` log shows every step with a user attached (FR-11).
- **Expiry Trap resolved** — a demo can show a filter batch triggering an `expiry_warning` alert at 8 months, and the system selecting that batch first for the next reservation (FR-13, FR-14).
- All P0 functional requirements are implemented and observable through the UI without error.
