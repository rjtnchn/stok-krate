// api/client.js
// Thin fetch wrapper shared by all Items/Batches components.
// Assumes a same-origin API at /api/... — change API_BASE if it lives elsewhere.

import { ApiError, getErrorMessage } from "./errors";
import { mockApi } from "./mockApi";

// ============================================================================
// DEMO MODE — set this to false once your real backend exists at /api/...
// While true, every api.* call below is served by the in-memory fake data
// in mockApi.js instead of hitting the network, so the whole app (Items,
// Orders, Alerts, Reports, both dashboards, login) works for a live demo
// with zero backend running. Data resets on every full page reload.
//
// To switch to the real backend: set this to false. Nothing else in the
// app needs to change — every component calls api.* the same way either
// way. You can delete mockApi.js at that point too.
const USE_MOCK_DATA = true;
// ============================================================================

const API_BASE = "/api";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Reads a cookie by name. Assumes the CSRF cookie is readable by JS (i.e.
// not HttpOnly) — the common Django/Rails/Express-csurf pattern where the
// server sets a non-HttpOnly token cookie specifically so the frontend can
// echo it back in a header. If your backend uses a different CSRF delivery
// mechanism (e.g. a token embedded in a <meta> tag, or returned from a
// /csrf endpoint), swap the body of this function accordingly.
function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie("csrftoken");
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    method,
    headers,
  });

  // 204 No Content has no body to parse
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const looksLikeJson = contentType.includes("application/json");

  // If there's no real API at this path yet, a dev server (Vite, CRA, etc.)
  // will often respond 200 with its own index.html instead of a 404 —
  // e.g. no backend running yet, or no proxy configured for /api. Treat
  // that as a failure rather than silently succeeding with an empty body,
  // which would otherwise let `null` flow into components expecting real
  // data and crash them.
  if (res.ok && !looksLikeJson) {
    throw new ApiError(res.status, {
      message:
        "The API didn't return JSON for this request — check that the backend is running and /api is reachable.",
    });
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response body, leave as null
  }

  if (!res.ok) {
    throw new ApiError(res.status, body);
  }

  return body;
}

const realApi = {
  getItems: () => request("/items"),
  getItem: (itemId) => request(`/items/${itemId}`),
  createItem: (payload) =>
    request("/items", { method: "POST", body: JSON.stringify(payload) }),
  updateItem: (itemId, payload) =>
    request(`/items/${itemId}`, { method: "PUT", body: JSON.stringify(payload) }),

  getBatches: (itemId) => request(`/items/${itemId}/batches`),
  createBatch: (itemId, payload) =>
    request(`/items/${itemId}/batches`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOrders: () => request("/orders"),
  createOrder: (payload) =>
    request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  fulfilOrder: (orderId) =>
    request(`/orders/${orderId}/fulfil`, { method: "PUT" }),
  cancelOrder: (orderId) =>
    request(`/orders/${orderId}/cancel`, { method: "PUT" }),

  checkAlertsNow: () => request("/alerts/check-now", { method: "POST" }),
  getReorderAlerts: (resolved = false) =>
    request(`/alerts/reorder?resolved=${resolved ? 1 : 0}`),
  getExpiryAlerts: (resolved = false) =>
    request(`/alerts/expiry?resolved=${resolved ? 1 : 0}`),
  resolveAlert: (alertId) =>
    request(`/alerts/${alertId}/resolve`, { method: "PUT" }),

  getStockLevelsReport: () => request("/reports/stock-levels"),
  getShrinkageReport: () => request("/reports/shrinkage"),
  getExpiryRiskReport: () => request("/reports/expiry-risk"),
  getDashboardSummary: () => request("/reports/dashboard-summary"),
  getRecentTransactions: (limit = 10) =>
    request(`/reports/recent-transactions?limit=${limit}`),

  getCurrentUser: () => request("/auth/me"),
  login: (credentials) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  logout: () => request("/auth/logout", { method: "POST" }),
};

export const api = USE_MOCK_DATA ? mockApi : realApi;

export { ApiError, getErrorMessage };