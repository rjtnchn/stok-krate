// lib/inventory.js
// Shared derivations for how inventory state is *presented*. The underlying
// business rules live in the API layer; these helpers only decide what a value
// is called and how urgent it looks, so every screen says the same thing about
// the same batch or alert.

import { AlertTriangle, PackageX } from "lucide-react";

// Whole days remaining until expiry_date, counting from today. Negative means
// the batch is already expired.
export function daysUntilExpiry(expiryDate) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / MS_PER_DAY);
}

// Amber while expiry is approaching, rust once it is imminent or past.
export function expiryStatus(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return { days, label: `Expired ${Math.abs(days)}d ago`, tone: "critical" };
  if (days === 0) return { days, label: "Expires today", tone: "critical" };
  if (days <= 7) return { days, label: `${days}d left`, tone: "critical" };
  return { days, label: `${days}d left`, tone: "pending" };
}

// Rust for a stockout or a deep shortfall, amber while merely approaching the
// reorder point. `key` is the coarse bucket the alert counters group on.
export function reorderSeverity(availableQty, reorderPoint) {
  if (availableQty <= 0) {
    return { label: "Stockout", tone: "critical", icon: PackageX, key: "critical" };
  }
  if (availableQty <= reorderPoint * 0.5) {
    return { label: "Critical", tone: "critical", icon: AlertTriangle, key: "critical" };
  }
  return { label: "Approaching ROP", tone: "pending", icon: AlertTriangle, key: "low" };
}

export function reorderDeficit(availableQty, reorderPoint) {
  return Math.max(reorderPoint - availableQty, 0);
}

// Date helpers used across tables so a DATE never renders a midnight time.
export function formatDay(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDay(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
