import { Routes, Route, Navigate } from "react-router-dom";
import { useCurrentUser } from "@/api/auth";

import AppLayout from "@/components/layout/AppLayout";

import ItemsPage from "@/features/inventory/ItemsPage";
import ItemDetailPage from "@/features/inventory/ItemDetailPage";

import OrdersPage from "@/features/orders/OrdersPage";

import AlertsListPage from "@/features/alerts/AlertsListPage";

import StockLevelsReportPage from "@/features/reports/StockLevelsReportPage";
import ShrinkageReportPage from "@/features/reports/ShrinkageReportPage";
import ExpiryRiskReportPage from "@/features/reports/ExpiryRiskReportPage";

import AdminDashboardPage from "@/features/dashboard/AdminDashboardPage";
import StaffDashboardPage from "@/features/dashboard/StaffDashboardPage";
import LoginPage from "@/features/auth/LoginPage";

import UsersPage from "@/features/users/UsersPage";
import ReceiveStockPage from "@/features/inventory/ReceiveStockPage";
import ActivityLogPage from "@/features/reports/ActivityLogPage";
import AuditSummaryPage from "@/features/reports/AuditSummaryPage";

// Sends "/" to the right landing page based on role, or to /login if
// there's no session yet.
function HomeRedirect() {
  const { role, isLoading } = useCurrentUser();

  if (isLoading) return <p className="p-6 text-sm text-steel">Loading…</p>;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "staff") return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function NotFoundPage() {
  return (
    <div>
      <p className="text-sm text-steel">Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* /login stays outside AppLayout so it renders without TopNav */}
      <Route path="/login" element={<LoginPage />} />

      {/* Everything else is nested under AppLayout, which mounts TopNav
          once and renders the matched route via <Outlet />. */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRedirect />} />

        {/* Admin — Items workspace. The list, the batches view and the create
            form share one page; the path selects the tab, which is what keeps
            the SideNav's "Add item" deep link working. */}
        <Route path="/admin/items" element={<ItemsPage />} />
        <Route path="/admin/items/batches" element={<ItemsPage />} />
        <Route path="/admin/items/new" element={<ItemsPage />} />
        {/* Static segments above outrank this, so :itemId only catches ids. */}
        <Route path="/admin/items/:itemId" element={<ItemDetailPage />} />

        {/* Orders workspace — history and Place order share one page, both
            roles. Not role-restricted: the API already filters admin-sees-all
            vs staff-sees-own. */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrdersPage />} />

        {/* Stock receipt — reachable by Staff as well as Admin (FR-08), so it
            stays its own page rather than a tab on the admin-only Items page. */}
        <Route path="/receive" element={<ReceiveStockPage />} />

        {/* Admin — Alerts */}
        <Route path="/admin/alerts" element={<AlertsListPage />} />

        {/* Admin — Users workspace: list and Add user share one page
            (placeholder data, see SideNav) */}
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/users/new" element={<UsersPage />} />

        {/* Batch receipt lives at /receive for both roles — the old
            /admin/batches/new duplicate was removed. */}
        <Route path="/admin/batches/new" element={<Navigate to="/receive" replace />} />

        {/* Admin — Reports */}
        <Route path="/admin/reports/stock-levels" element={<StockLevelsReportPage />} />
        <Route path="/admin/reports/shrinkage" element={<ShrinkageReportPage />} />
        <Route path="/admin/reports/expiry-risk" element={<ExpiryRiskReportPage />} />

        {/* Admin — Activity log / Audit summary (placeholders, see SideNav) */}
        <Route path="/admin/activity-log" element={<ActivityLogPage />} />
        <Route path="/admin/audit-summary" element={<AuditSummaryPage />} />

        {/* Dashboards */}
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/staff/dashboard" element={<StaffDashboardPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
