// api/mockApi.js
// A fake backend, entirely in-memory, matching the same method signatures
// as the real `api` object in client.js. Every page in the app calls
// through `api.*` (see client.js's USE_MOCK_DATA switch), so nothing in
// any component needs to know this exists.
//
// Data resets whenever the page fully reloads (it's just a JS module-level
// variable) — that's normal and expected for a demo.
//
// TO REMOVE ONCE YOUR BACKEND EXISTS: set USE_MOCK_DATA = false in
// client.js. You can delete this whole file at that point too.

import { ApiError } from "./errors";

function delay(ms = 300 + Math.random() * 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / MS_PER_DAY);
}

// A date `months` before today, as YYYY-MM-DD. Seeded batch ages are anchored
// to "today" instead of hardcoded dates, so the 8-month expiry check below
// behaves the same whenever the demo is run.
function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

// Whole months elapsed since dateStr — drives the FR-14 8-month check.
function monthsSince(dateStr) {
  if (!dateStr) return 0;
  const from = new Date(dateStr);
  const now = new Date();
  let months =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  return months;
}

// FR-19 seasonal schedule: March–May → 2.5 (pre-peak), August–February → 0.3
// (post-peak). June–July has no bracket, so Sf is left untouched in those
// months rather than invented.
function seasonalFactorForMonth(month) {
  if (month >= 3 && month <= 5) return 2.5;
  if (month >= 8 || month <= 2) return 0.3;
  return null;
}

let nextId = 1000;
function makeId() {
  return nextId++;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// Items mirror the blueprint's own ABC Analysis examples exactly, so the
// demo data lines up with what the panel already read in the PRD/SPEC:
//   A — Portable AC Units, Smart Thermostats (highest value / close monitoring)
//   B — Air Purifiers (moderate value, stable year-round demand)
//   C — Air Purifier Filters (low cost, but expire — rotation matters)
let items = [
  {
    id: 1,
    sku: "AC-15T-004",
    name: "Portable AC Unit - 1.5HP",
    category: "Appliances",
    turnover_category: "A",
    seasonal_flag: true,
    reorder_point: 20,
    current_sf: 2.5, // stale pre-peak value — Check Now recalculates it for the current month (FR-19)
  },
  {
    id: 2,
    sku: "AC-20T-005",
    name: "Portable AC Unit - 2.0HP",
    category: "Appliances",
    turnover_category: "A",
    seasonal_flag: true,
    reorder_point: 15,
    current_sf: 2.5,
  },
  {
    id: 3,
    sku: "THM-V2-045",
    name: "Smart Thermostat V2",
    category: "Electronics",
    turnover_category: "A",
    seasonal_flag: false,
    reorder_point: 15,
    current_sf: 1.0,
  },
  {
    id: 4,
    sku: "PUR-CMP-011",
    name: "Air Purifier - Compact",
    category: "Appliances",
    turnover_category: "B",
    seasonal_flag: false,
    reorder_point: 12,
    current_sf: 1.0,
  },
  {
    id: 5,
    sku: "FLT-STD-021",
    name: "Carbon Filter - Standard",
    category: "Parts",
    turnover_category: "C",
    seasonal_flag: false,
    reorder_point: 30,
    current_sf: 1.0, // non-seasonal — Sf stays at baseline
  },
];

// item_id -> array of batches. Deliberately staged so the first Check Now on a
// fresh load produces at least one new alert of each type:
//   - AC 1.5HP (A-2093) is below its reorder point and ALREADY has an alert,
//     so the Alerts page isn't empty on load — Summer Crunch.
//   - Smart Thermostat (T-1187) is below its reorder point with NO alert yet,
//     so Check Now raises one. 12 on hand echoes the case study's "system said
//     45, warehouse had 12" — Mystery Shrinkage.
//   - Filter lot C-2291 is 8+ months old and ALREADY has an expiry warning.
//   - Filter lot C-2305 is 8+ months old with NO warning yet, so Check Now
//     raises one — Expiry Trap.
//   - Filter lot C-2340 is fresh, so Check Now shows a mix rather than
//     flagging every batch.
// Filters use the blueprint's 9-month shelf life: expiry = received + 9 months.
let batches = {
  1: [{ id: makeId(), item_id: 1, lot_number: "A-2093", quantity_on_hand: 8, reserved_qty: 2, received_date: monthsAgo(3), expiry_date: null }],
  2: [{ id: makeId(), item_id: 2, lot_number: "A-2101", quantity_on_hand: 34, reserved_qty: 4, received_date: monthsAgo(2), expiry_date: null }],
  3: [{ id: makeId(), item_id: 3, lot_number: "T-1187", quantity_on_hand: 12, reserved_qty: 5, received_date: monthsAgo(4), expiry_date: null }],
  4: [{ id: makeId(), item_id: 4, lot_number: "P-3042", quantity_on_hand: 18, reserved_qty: 0, received_date: monthsAgo(3), expiry_date: null }],
  5: [
    { id: makeId(), item_id: 5, lot_number: "C-2291", quantity_on_hand: 50, reserved_qty: 0, received_date: monthsAgo(9), expiry_date: daysFromNow(3) },
    { id: makeId(), item_id: 5, lot_number: "C-2305", quantity_on_hand: 100, reserved_qty: 0, received_date: monthsAgo(8), expiry_date: daysFromNow(30) },
    { id: makeId(), item_id: 5, lot_number: "C-2340", quantity_on_hand: 80, reserved_qty: 0, received_date: monthsAgo(1), expiry_date: daysFromNow(240) },
  ],
};

let orders = [
  {
    id: 101,
    created_at: "2026-08-26T09:12:00Z",
    item_id: 3,
    item_name: "Smart Thermostat V2",
    batch_lot_number: "T-1187",
    quantity: 5,
    status: "pending",
  },
  {
    id: 102,
    created_at: "2026-08-20T14:03:00Z",
    item_id: 5,
    item_name: "Carbon Filter - Standard",
    batch_lot_number: "C-2305",
    quantity: 10,
    status: "fulfilled",
  },
  {
    id: 103,
    created_at: "2026-08-27T11:47:00Z",
    item_id: 1,
    item_name: "Portable AC Unit - 1.5HP",
    batch_lot_number: "A-2093",
    quantity: 2,
    status: "pending",
  },
  {
    id: 104,
    created_at: "2026-08-25T08:30:00Z",
    item_id: 4,
    item_name: "Air Purifier - Compact",
    batch_lot_number: "P-3042",
    quantity: 3,
    status: "fulfilled",
  },
  {
    id: 105,
    created_at: "2026-08-24T13:15:00Z",
    item_id: 2,
    item_name: "Portable AC Unit - 2.0HP",
    batch_lot_number: "A-2101",
    quantity: 4,
    status: "fulfilled",
  },
  {
    id: 106,
    created_at: "2026-08-22T10:05:00Z",
    item_id: 5,
    item_name: "Carbon Filter - Standard",
    batch_lot_number: "C-2291",
    quantity: 6,
    status: "cancelled",
  },
];

let reorderAlerts = [
  {
    id: 501,
    item_id: 1,
    item_name: "Portable AC Unit - 1.5HP",
    sku: "AC-15T-004",
    available_qty: 6, // 8 on hand - 2 reserved
    reorder_point: 20,
    created_at: "2026-08-27T08:00:00Z",
    resolved: false,
  },
];

let expiryAlerts = [
  {
    id: 601,
    item_id: 5,
    lot_number: "C-2291",
    item_name: "Carbon Filter - Standard",
    expiry_date: daysFromNow(3),
    quantity_on_hand: 50,
    created_at: "2026-08-27T08:00:00Z",
    resolved: false,
  },
];

let transactions = [
  { id: makeId(), item_name: "Carbon Filter - Standard", lot_number: "C-2305", transaction_type: "fulfillment", quantity: -10, user_name: "Juan Garcia", timestamp: "2026-08-21T10:00:00Z" },
  { id: makeId(), item_name: "Carbon Filter - Standard", lot_number: "C-2305", transaction_type: "reservation", quantity: 10, user_name: "Juan Garcia", timestamp: "2026-08-20T14:03:00Z" },
  { id: makeId(), item_name: "Portable AC Unit - 1.5HP", lot_number: "A-2093", transaction_type: "reservation", quantity: 2, user_name: "Maria Reyes", timestamp: "2026-08-27T11:47:00Z" },
  { id: makeId(), item_name: "Smart Thermostat V2", lot_number: "T-1187", transaction_type: "reservation", quantity: 5, user_name: "Maria Reyes", timestamp: "2026-08-26T09:12:00Z" },
  { id: makeId(), item_name: "Air Purifier - Compact", lot_number: "P-3042", transaction_type: "fulfillment", quantity: -3, user_name: "Ana Cruz", timestamp: "2026-08-25T08:40:00Z" },
  { id: makeId(), item_name: "Air Purifier - Compact", lot_number: "P-3042", transaction_type: "reservation", quantity: 3, user_name: "Ana Cruz", timestamp: "2026-08-25T08:30:00Z" },
  { id: makeId(), item_name: "Portable AC Unit - 2.0HP", lot_number: "A-2101", transaction_type: "fulfillment", quantity: -4, user_name: "Juan Garcia", timestamp: "2026-08-24T13:25:00Z" },
  { id: makeId(), item_name: "Carbon Filter - Standard", lot_number: "C-2291", transaction_type: "receipt", quantity: 50, user_name: "Maria Reyes", timestamp: "2026-08-15T09:00:00Z" },
];

// FR-23 shape: adjustments only, with the signed delta and who recorded it.
// Cancellations live in `transactions` (see cancelOrder) and are excluded from
// this list by type, not by being left unlogged.
let shrinkageEntries = [
  { id: makeId(), item_name: "Smart Thermostat V2", lot_number: "T-1187", user_name: "Juan Garcia", transaction_type: "adjustment", quantity: -2, created_at: "2026-08-18T16:20:00Z" },
  { id: makeId(), item_name: "Carbon Filter - Standard", lot_number: "C-2291", user_name: "Maria Reyes", transaction_type: "adjustment", quantity: -4, created_at: "2026-08-24T11:05:00Z" },
  { id: makeId(), item_name: "Air Purifier - Compact", lot_number: "P-3042", user_name: "Ana Cruz", transaction_type: "adjustment", quantity: 3, created_at: "2026-08-28T15:40:00Z" },
];

// Demo accounts — the only credentials login() accepts. Anything else is
// rejected with 401 INVALID_CREDENTIALS (FR-01b).
const DEMO_USERS = [
  { id: 1, name: "Site Admin", email: "admin@wb.com", password: "admin123", role: "admin" },
  { id: 2, name: "Juan Garcia", email: "staff@wb.com", password: "staff123", role: "staff" },
];

// A fake "logged in" session, set by login().
let mockSession = null; // null | { id, name, email, role }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findItem(itemId) {
  return items.find((i) => String(i.id) === String(itemId));
}

function findBatchByLot(itemId, lotNumber) {
  return (batches[itemId] || []).find((b) => b.lot_number === lotNumber);
}

function availableForItem(itemId) {
  return (batches[itemId] || []).reduce(
    (sum, b) => sum + (b.quantity_on_hand - b.reserved_qty),
    0
  );
}

// FEFO: earliest expiry_date first; batches with no expiry_date sort last.
//
// The earliest-expiry eligible batch must cover the whole order on its own.
// There is no batch splitting, and no substituting a later-expiry batch just
// because it happens to fit — either would break FEFO. If the FEFO batch
// can't cover the request, the order is rejected with INSUFFICIENT_STOCK.
function pickFefoBatch(itemId, quantity) {
  const candidates = [...(batches[itemId] || [])]
    .filter((b) => b.quantity_on_hand - b.reserved_qty > 0)
    .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    });

  const batch = candidates[0];
  const available = batch ? batch.quantity_on_hand - batch.reserved_qty : 0;

  if (!batch || available < quantity) {
    throw new ApiError(422, {
      code: "INSUFFICIENT_STOCK",
      available,
      requested: quantity,
      message: `Not enough stock available (available: ${available}, requested: ${quantity})`,
    });
  }

  return batch;
}

// Name to show in the transaction log. Uses the signed-in demo account so
// rows written during a demo read the same way as the seeded ones.
function currentUserLabel() {
  return currentUser().name;
}

// Who to attribute a write to. Falls back to the Admin demo account when the
// login screen's demo shortcut was used, since that sets role in React only
// and never creates a mockSession.
function currentUser() {
  return mockSession ?? DEMO_USERS[0];
}

// ---------------------------------------------------------------------------
// Mock API surface — same method names/shapes as the real client
// ---------------------------------------------------------------------------

export const mockApi = {
  // --- Items ---
  async getItems() {
    await delay();
    return items.map((i) => ({ ...i }));
  },

  async getItem(itemId) {
    await delay();
    const item = findItem(itemId);
    if (!item) throw new ApiError(404, { message: "Item not found." });
    return { ...item };
  },

  async createItem(payload) {
    await delay();
    if (items.some((i) => i.sku === payload.sku)) {
      throw new ApiError(422, { errors: { sku: "already taken" } });
    }
    // Non-seasonal items sit at the Sf baseline of 1.00 regardless of input.
    const item = {
      id: makeId(),
      ...payload,
      current_sf: payload.seasonal_flag ? Number(payload.current_sf) || 1.0 : 1.0,
    };
    items.push(item);
    batches[item.id] = [];
    return { ...item };
  },

  async updateItem(itemId, payload) {
    await delay();
    const item = findItem(itemId);
    if (!item) throw new ApiError(404, { message: "Item not found." });
    if (payload.sku !== item.sku && items.some((i) => i.sku === payload.sku)) {
      throw new ApiError(422, { errors: { sku: "already taken" } });
    }
    Object.assign(item, payload);
    return { ...item };
  },

  // --- Batches ---
  async getBatches(itemId) {
    await delay();
    return (batches[itemId] || []).map((b) => ({ ...b }));
  },

  async createBatch(itemId, payload) {
    await delay();
    if (!findItem(itemId)) throw new ApiError(404, { message: "Item not found." });

    const errors = {};
    if (Number(payload.quantity) < 0) errors.quantity = "Quantity cannot be negative.";
    if (payload.received_date && payload.expiry_date) {
      if (new Date(payload.expiry_date) < new Date(payload.received_date)) {
        errors.expiry_date = "Expiry date cannot be before the received date.";
      }
    }
    if (findBatchByLot(itemId, payload.lot_number)) {
      errors.lot_number = "A batch with this lot number already exists for this item.";
    }
    if (Object.keys(errors).length > 0) throw new ApiError(422, { errors });

    const batch = {
      id: makeId(),
      item_id: Number(itemId),
      lot_number: payload.lot_number,
      quantity_on_hand: Number(payload.quantity),
      reserved_qty: 0,
      received_date: payload.received_date,
      expiry_date: payload.expiry_date || null,
    };
    batches[itemId] = [...(batches[itemId] || []), batch];

    const item = findItem(itemId);
    transactions.unshift({
      id: makeId(),
      item_name: item?.name || "",
      lot_number: batch.lot_number,
      transaction_type: "receipt",
      quantity: batch.quantity_on_hand,
      user_name: currentUserLabel(),
      timestamp: nowIso(),
    });

    return { ...batch };
  },

  // --- Orders ---
  async getOrders() {
    await delay();
    // Real API would filter staff-sees-own vs admin-sees-all; the mock
    // returns everything regardless of role, since there's only one fake
    // session at a time in this demo.
    return orders.map((o) => ({ ...o }));
  },

  async createOrder(payload) {
    await delay();
    const item = findItem(payload.item_id);
    if (!item) throw new ApiError(404, { message: "Item not found." });

    const requested = Number(payload.quantity);
    const available = availableForItem(payload.item_id);
    if (requested > available) {
      throw new ApiError(422, {
        code: "INSUFFICIENT_STOCK",
        available,
        requested,
        message: `Not enough stock available (available: ${available}, requested: ${requested})`,
      });
    }

    const batch = pickFefoBatch(payload.item_id, requested);
    batch.reserved_qty += requested;

    const order = {
      id: makeId(),
      created_at: nowIso(),
      item_id: item.id,
      item_name: item.name,
      batch_lot_number: batch.lot_number,
      quantity: requested,
      status: "pending",
    };
    orders.unshift(order);

    transactions.unshift({
      id: makeId(),
      item_name: item.name,
      lot_number: batch.lot_number,
      transaction_type: "reservation",
      quantity: requested,
      user_name: currentUserLabel(),
      timestamp: nowIso(),
    });

    return { ...order };
  },

  async fulfilOrder(orderId) {
    await delay();
    const order = orders.find((o) => String(o.id) === String(orderId));
    if (!order) throw new ApiError(404, { message: "Order not found." });
    if (order.status !== "pending") {
      throw new ApiError(409, { message: `This order is already ${order.status}.` });
    }

    const batch = findBatchByLot(order.item_id, order.batch_lot_number);
    if (batch) {
      batch.quantity_on_hand -= order.quantity;
      batch.reserved_qty -= order.quantity;
    }
    order.status = "fulfilled";

    transactions.unshift({
      id: makeId(),
      item_name: order.item_name,
      lot_number: order.batch_lot_number,
      transaction_type: "fulfillment",
      quantity: -order.quantity,
      user_name: currentUserLabel(),
      timestamp: nowIso(),
    });

    return { ...order };
  },

  async cancelOrder(orderId) {
    await delay();
    const order = orders.find((o) => String(o.id) === String(orderId));
    if (!order) throw new ApiError(404, { message: "Order not found." });
    if (order.status !== "pending") {
      throw new ApiError(409, { message: `This order is already ${order.status}.` });
    }

    const batch = findBatchByLot(order.item_id, order.batch_lot_number);
    if (batch) batch.reserved_qty -= order.quantity;
    order.status = "cancelled";

    // FR-11: every stock movement gets a transaction row, cancellations
    // included. The row is typed 'cancellation' (not 'adjustment') so the
    // shrinkage report can exclude it by type rather than by us skipping the
    // write — see getShrinkageReport().
    transactions.unshift({
      id: makeId(),
      batch_id: batch?.id ?? null,
      user_id: currentUser().id,
      item_name: order.item_name,
      lot_number: order.batch_lot_number,
      transaction_type: "cancellation",
      quantity: -order.quantity,
      user_name: currentUserLabel(),
      timestamp: nowIso(),
    });

    return { ...order };
  },

  // --- Alerts ---
  async checkAlertsNow() {
    await delay(500);

    let expiryWarningsCreated = 0;
    let reorderAlertsCreated = 0;
    const sfChanges = [];

    // FR-14: flag a batch once it is 8+ months past its received_date (one
    // month before the 9-month filter shelf life runs out). Batches with no
    // expiry_date are non-perishable and never flagged; batches already past
    // expiry are skipped — the warning exists to act *before* that point.
    for (const itemId of Object.keys(batches)) {
      for (const batch of batches[itemId]) {
        if (!batch.expiry_date) continue;
        if (monthsSince(batch.received_date) < 8) continue;
        if (daysUntil(batch.expiry_date) < 0) continue;

        const alreadyAlerted = expiryAlerts.some(
          (a) => a.lot_number === batch.lot_number && a.item_id === Number(itemId) && !a.resolved
        );
        if (alreadyAlerted) continue;

        const item = findItem(itemId);
        expiryAlerts.unshift({
          id: makeId(),
          item_id: Number(itemId),
          lot_number: batch.lot_number,
          item_name: item?.name || "",
          expiry_date: batch.expiry_date,
          quantity_on_hand: batch.quantity_on_hand,
          created_at: nowIso(),
          resolved: false,
        });
        expiryWarningsCreated++;
      }
    }

    // FR-18: one unresolved reorder alert per item, never a duplicate.
    for (const item of items) {
      const available = availableForItem(item.id);
      if (available > item.reorder_point) continue;
      const alreadyAlerted = reorderAlerts.some((a) => a.item_id === item.id && !a.resolved);
      if (alreadyAlerted) continue;

      reorderAlerts.unshift({
        id: makeId(),
        item_id: item.id,
        item_name: item.name,
        sku: item.sku,
        available_qty: available,
        reorder_point: item.reorder_point,
        created_at: nowIso(),
        resolved: false,
      });
      reorderAlertsCreated++;
    }

    // FR-19: actually write current_sf for seasonal items from the monthly
    // schedule, and report what changed so the UI can show before → after.
    const targetSf = seasonalFactorForMonth(new Date().getMonth() + 1);
    if (targetSf !== null) {
      for (const item of items) {
        if (!item.seasonal_flag) continue;
        if (item.current_sf === targetSf) continue;
        sfChanges.push({ item_name: item.name, from: item.current_sf, to: targetSf });
        item.current_sf = targetSf;
      }
    }

    return {
      reorder_alerts_created: reorderAlertsCreated,
      expiry_warnings_created: expiryWarningsCreated,
      sf_changes: sfChanges,
    };
  },

  async getReorderAlerts(resolved = false) {
    await delay();
    return reorderAlerts.filter((a) => a.resolved === Boolean(resolved)).map((a) => ({ ...a }));
  },

  async getExpiryAlerts(resolved = false) {
    await delay();
    return expiryAlerts.filter((a) => a.resolved === Boolean(resolved)).map((a) => ({ ...a }));
  },

  async resolveAlert(alertId) {
    await delay();
    const alert =
      reorderAlerts.find((a) => String(a.id) === String(alertId)) ||
      expiryAlerts.find((a) => String(a.id) === String(alertId));

    if (!alert) throw new ApiError(404, { message: "Alert not found." });
    if (alert.resolved) {
      throw new ApiError(409, {
        code: "ALREADY_RESOLVED",
        message: "This alert has already been resolved.",
      });
    }
    // FR-21: record who resolved it and when, not just the boolean.
    const user = currentUser();
    alert.resolved = true;
    alert.resolved_by = user.id;
    alert.resolved_by_name = user.name;
    alert.resolved_at = nowIso();
    return { ...alert };
  },

  // --- Reports ---
  async getStockLevelsReport() {
    await delay();
    const rows = [];
    for (const item of items) {
      for (const batch of batches[item.id] || []) {
        rows.push({
          item_id: item.id,
          item_name: item.name,
          sku: item.sku,
          lot_number: batch.lot_number,
          on_hand: batch.quantity_on_hand,
          reserved: batch.reserved_qty,
          available_qty: batch.quantity_on_hand - batch.reserved_qty,
          reorder_point: item.reorder_point,
          expiry_date: batch.expiry_date,
        });
      }
    }
    return rows;
  },

  async getShrinkageReport() {
    await delay();
    // FR-23: shrinkage is adjustments only. Cancellations are written to the
    // transaction log (see cancelOrder) and excluded here by type, so the
    // audit trail stays complete without polluting this report.
    return shrinkageEntries
      .filter((e) => e.transaction_type === "adjustment")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((e) => ({ ...e }));
  },

  async getExpiryRiskReport() {
    await delay();
    const rows = [];
    for (const item of items) {
      for (const batch of batches[item.id] || []) {
        if (!batch.expiry_date) continue;
        rows.push({
          item_id: item.id,
          item_name: item.name,
          lot_number: batch.lot_number,
          on_hand: batch.quantity_on_hand,
          expiry_date: batch.expiry_date,
          days_until_expiry: daysUntil(batch.expiry_date),
        });
      }
    }
    return rows.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  },

  async getDashboardSummary() {
    await delay();
    return {
      active_reorder_alerts: reorderAlerts.filter((a) => !a.resolved).length,
      active_expiry_warnings: expiryAlerts.filter((a) => !a.resolved).length,
      total_skus: items.length,
    };
  },

  async getRecentTransactions(limit = 10) {
    await delay();
    return transactions.slice(0, limit).map((t) => ({ ...t }));
  },

  // --- Auth ---
  async getCurrentUser() {
    await delay(150);
    if (!mockSession) throw new ApiError(401, { message: "Not logged in." });
    return { ...mockSession };
  },

  async login(credentials) {
    await delay();
    // Accepts either key — the login form still posts `username`.
    const identifier = (credentials?.email || credentials?.username || "").trim().toLowerCase();
    const password = credentials?.password || "";

    // Missing fields stay a 422 (matches the documented login contract).
    if (!identifier || !password) {
      throw new ApiError(422, { errors: { password: "Email and password are required." } });
    }

    // FR-01b: anything that isn't one of the two demo accounts is rejected
    // with 401 INVALID_CREDENTIALS, and no session is created.
    const user = DEMO_USERS.find((u) => u.email === identifier && u.password === password);
    if (!user) {
      throw new ApiError(401, {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }

    mockSession = { id: user.id, name: user.name, email: user.email, role: user.role };
    return { ...mockSession };
  },

  async logout() {
    await delay(150);
    mockSession = null;
    return null;
  },
};