// api/client.js
// Thin fetch wrapper shared by all Items/Batches components.
// Assumes a same-origin API at /api/... — change API_BASE if it lives elsewhere.

import { ApiError, getErrorMessage } from "./errors";
import { mockApi } from "./mockApi";

const USE_MOCK_DATA = false;

const API_BASE = "/api";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...options.headers };

  const token = sessionStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

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

  if (res.status === 401) {
    sessionStorage.removeItem("auth_token");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  // 204 No Content has no body to parse
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const looksLikeJson = contentType.includes("application/json");

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
  login: async (credentials) => {
    const res = await request("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
    if (res?.token) {
      sessionStorage.setItem("auth_token", res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem("auth_token");
    }
  },
};

export const api = USE_MOCK_DATA ? mockApi : realApi;

export { ApiError, getErrorMessage };
