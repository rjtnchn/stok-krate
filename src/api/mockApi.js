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

let nextId = 1000;
function makeId() {
  return nextId++;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

let items = [
  {
    id: 1,
    sku: "AC-100",
    name: "AC Unit - 1.5HP",
    category: "Appliances",
    turnover_category: "fast",
    seasonal_flag: true,
    reorder_point: 20,
    safety_factor: 1.2,
    current_sf: 2.5, // pre-peak seasonal factor, matches the Summer Crunch walkthrough
  },
  {
    id: 2,
    sku: "THERM-200",
    name: "Smart Thermostat",
    category: "Electronics",
    turnover_category: "medium",
    seasonal_flag: false,
    reorder_point: 15,
    safety_factor: 1.0,
    current_sf: 1.0,
  },
  {
    id: 3,
    sku: "FILTER-050",
    name: "HVAC Air Filter",
    category: "Parts",
    turnover_category: "fast",
    seasonal_flag: false,
    reorder_point: 30,
    safety_factor: 1.1,
    current_sf: 1.1,
  },
  {
    id: 4,
    sku: "FAN-300",
    name: "Ceiling Fan",
    category: "Appliances",
    turnover_category: "slow",
    seasonal_flag: true,
    reorder_point: 10,
    safety_factor: 1.0,
    current_sf: 1.0,
  },
  {
    id: 5,
    sku: "DUCT-010",
    name: "Flexible Duct 10ft",
    category: "Parts",
    turnover_category: "medium",
    seasonal_flag: false,
    reorder_point: 25,
    safety_factor: 1.0,
    current_sf: 1.0,
  },
];

// item_id -> array of batches. Deliberately includes a low-stock item
// (AC Unit, below its reorder point) and a near-expiry lot (HVAC Filter,
// 5 days out) so Check Now has something to find right away.
let batches = {
  1: [{ id: makeId(), item_id: 1, lot_number: "AC-L1", quantity_on_hand: 8, reserved_qty: 2, received_date: "2026-06-01", expiry_date: null }],
  2: [{ id: makeId(), item_id: 2, lot_number: "TH-A1", quantity_on_hand: 40, reserved_qty: 5, received_date: "2026-05-15", expiry_date: null }],
  3: [
    { id: makeId(), item_id: 3, lot_number: "FIL-EARLY", quantity_on_hand: 50, reserved_qty: 0, received_date: "2026-07-01", expiry_date: daysFromNow(5) },
    { id: makeId(), item_id: 3, lot_number: "FIL-LATE", quantity_on_hand: 100, reserved_qty: 0, received_date: "2026-08-01", expiry_date: daysFromNow(180) },
  ],
  4: [{ id: makeId(), item_id: 4, lot_number: "FAN-B1", quantity_on_hand: 12, reserved_qty: 0, received_date: "2026-04-10", expiry_date: null }],
  5: [{ id: makeId(), item_id: 5, lot_number: "DUCT-C1", quantity_on_hand: 60, reserved_qty: 0, received_date: "2026-06-20", expiry_date: null }],
};

let orders = [
  {
    id: 101,
    created_at: "2026-08-26T09:12:00Z",
    item_id: 2,
    item_name: "Smart Thermostat",
    batch_lot_number: "TH-A1",
    quantity: 5,
    status: "pending",
  },
  {
    id: 102,
    created_at: "2026-08-20T14:03:00Z",
    item_id: 3,
    item_name: "HVAC Air Filter",
    batch_lot_number: "FIL-LATE",
    quantity: 10,
    status: "fulfilled",
  },
  {
    id: 103,
    created_at: "2026-08-27T11:47:00Z",
    item_id: 1,
    item_name: "AC Unit - 1.5HP",
    batch_lot_number: "AC-L1",
    quantity: 2,
    status: "pending",
  },
];

let reorderAlerts = [
  {
    id: 501,
    item_id: 1,
    item_name: "AC Unit - 1.5HP",
    sku: "AC-100",
    available_qty: 6, // 8 on hand - 2 reserved
    reorder_point: 20,
    created_at: "2026-08-27T08:00:00Z",
    resolved: false,
  },
];

let expiryAlerts = [
  {
    id: 601,
    item_id: 3,
    lot_number: "FIL-EARLY",
    item_name: "HVAC Air Filter",
    expiry_date: daysFromNow(5),
    quantity_on_hand: 50,
    created_at: "2026-08-27T08:00:00Z",
    resolved: false,
  },
];

let transactions = [
  { id: makeId(), item_name: "HVAC Air Filter", lot_number: "FIL-LATE", transaction_type: "fulfilment", quantity: -10, user: "jgarcia", timestamp: "2026-08-21T10:00:00Z" },
  { id: makeId(), item_name: "HVAC Air Filter", lot_number: "FIL-LATE", transaction_type: "reservation", quantity: 10, user: "jgarcia", timestamp: "2026-08-20T14:03:00Z" },
  { id: makeId(), item_name: "AC Unit - 1.5HP", lot_number: "AC-L1", transaction_type: "reservation", quantity: 2, user: "mreyes", timestamp: "2026-08-27T11:47:00Z" },
  { id: makeId(), item_name: "Smart Thermostat", lot_number: "TH-A1", transaction_type: "reservation", quantity: 5, user: "mreyes", timestamp: "2026-08-26T09:12:00Z" },
  { id: makeId(), item_name: "Ceiling Fan", lot_number: "FAN-B1", transaction_type: "receipt", quantity: 12, user: "jgarcia", timestamp: "2026-08-15T09:00:00Z" },
];

let shrinkageEntries = [
  { id: makeId(), item_name: "Ceiling Fan", lot_number: "FAN-B1", user: "jgarcia", quantity_delta: -2, timestamp: "2026-08-18T16:20:00Z" },
];

// A fake "logged in" session, set by login().
let mockSession = null; // null | { role: "admin" | "staff" }

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
function pickFefoBatch(itemId, quantity) {
  const candidates = [...(batches[itemId] || [])].sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date) - new Date(b.expiry_date);
  });
  return candidates.find((b) => b.quantity_on_hand - b.reserved_qty >= quantity) || candidates[0];
}

function currentUserLabel() {
  return mockSession?.role === "staff" ? "you (staff)" : "you (admin)";
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
    const item = { id: makeId(), current_sf: payload.safety_factor ?? 1.0, ...payload };
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
      user: currentUserLabel(),
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
      user: currentUserLabel(),
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
      transaction_type: "fulfilment",
      quantity: -order.quantity,
      user: currentUserLabel(),
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
    // Cancellations are intentionally excluded from the shrinkage report —
    // no shrinkage entry is added here, matching the report's own note.

    return { ...order };
  },

  // --- Alerts ---
  async checkAlertsNow() {
    await delay(500);

    let newAlertsCount = 0;
    for (const itemId of Object.keys(batches)) {
      for (const batch of batches[itemId]) {
        if (!batch.expiry_date) continue;
        const days = daysUntil(batch.expiry_date);
        if (days === null || days > 7) continue;

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
        newAlertsCount++;
      }
    }

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
      newAlertsCount++;
    }

    const seasonalUpdated = items.filter((i) => i.seasonal_flag).length;

    return {
      expiry_warnings_created: newAlertsCount,
      seasonal_factors_updated: seasonalUpdated,
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
    alert.resolved = true;
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
    return shrinkageEntries.map((e) => ({ ...e }));
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
    const username = (credentials?.username || "").toLowerCase();
    if (!username || !credentials?.password) {
      throw new ApiError(422, { errors: { password: "Username and password are required." } });
    }
    // Demo login: any username/password works. Include "staff" in the
    // username to log in as staff; anything else logs in as admin.
    const role = username.includes("staff") ? "staff" : "admin";
    mockSession = { role };
    return { ...mockSession };
  },

  async logout() {
    await delay(150);
    mockSession = null;
    return null;
  },
};