// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { useCurrentUser } from "./api/auth";

import AppLayout from "./components/AppLayout";

import ItemsListPage from "./components/ItemsListPage";
import CreateItemForm from "./components/CreateItemForm";
import ItemDetailPage from "./components/ItemDetailPage";

import PlaceOrderForm from "./components/PlaceOrderForm";
import OrdersListPage from "./components/OrdersListPage";

import AlertsListPage from "./components/AlertsListPage";

import StockLevelsReportPage from "./components/StockLevelsReportPage";
import ShrinkageReportPage from "./components/ShrinkageReportPage";
import ExpiryRiskReportPage from "./components/ExpiryRiskReportPage";

import AdminDashboardPage from "./components/AdminDashboardPage";
import StaffDashboardPage from "./components/StaffDashboardPage";
import LoginPage from "./components/LoginPage";

import UserListPage from "./components/UserListPage";
import AddUserPage from "./components/AddUserPage";
import AddBatchPage from "./components/AddBatchPage";
import ActivityLogPage from "./components/ActivityLogPage";
import AuditSummaryPage from "./components/AuditSummaryPage";

import "./styles/admin.css";

// Sends "/" to the right landing page based on role, or to /login if
// there's no session yet.
function HomeRedirect() {
  const { role, isLoading } = useCurrentUser();

  if (isLoading) return <p className="state-msg">Loading…</p>;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "staff") return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function NotFoundPage() {
  return (
    <div className="admin-page">
      <p className="state-msg">Page not found.</p>
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

        {/* Admin — Items/Batches */}
        <Route path="/admin/items" element={<ItemsListPage />} />
        <Route path="/admin/items/new" element={<CreateItemForm />} />
        <Route path="/admin/items/:itemId" element={<ItemDetailPage />} />

        {/* Orders — Place Order is available to both roles; RoleGuard on
            OrdersListPage itself isn't role-restricted since the API already
            filters admin-sees-all vs staff-sees-own. */}
        <Route path="/orders/new" element={<PlaceOrderForm />} />
        <Route path="/orders" element={<OrdersListPage />} />

        {/* Admin — Alerts */}
        <Route path="/admin/alerts" element={<AlertsListPage />} />

        {/* Admin — Users (placeholder pages, see SideNav) */}
        <Route path="/admin/users" element={<UserListPage />} />
        <Route path="/admin/users/new" element={<AddUserPage />} />

        {/* Admin — Add batch (placeholder, see SideNav) */}
        <Route path="/admin/batches/new" element={<AddBatchPage />} />

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