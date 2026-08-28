// components/TopNav.jsx
// Shared top nav bar for all admin/staff pages.
// Wire this into a layout wrapper once, instead of adding it page-by-page.

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useCurrentUser } from "../api/auth";
import "../styles/top-nav.css";

// Pages that "Quick jump" can search by name, in addition to items pulled
// from api.getItems(). Kept separate from ADMIN_NAV_LINKS/STAFF_NAV_LINKS
// so the top nav bar itself can stay short while quick jump still covers
// every admin page.
const SEARCHABLE_PAGES = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/items", label: "Item & batch list" },
  { to: "/admin/items/new", label: "Add item" },
  { to: "/admin/batches/new", label: "Add batch" },
  { to: "/admin/users", label: "User list" },
  { to: "/admin/users/new", label: "Add user" },
  { to: "/admin/alerts", label: "Alerts" },
  { to: "/admin/reports/stock-levels", label: "Stock levels report" },
  { to: "/admin/reports/shrinkage", label: "Shrinkage report" },
  { to: "/admin/reports/expiry-risk", label: "Expiry risk report" },
  { to: "/admin/activity-log", label: "Activity log" },
  { to: "/admin/audit-summary", label: "Audit summary" },
];

// NOTE: Product Search / Picking were in the original screenshot but have
// no matching route in App.jsx yet — add them back here once those routes
// exist.
const ADMIN_NAV_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/reports/stock-levels", label: "Stock levels report" },
  { to: "/admin/reports/shrinkage", label: "Shrinkage report" },
  { to: "/admin/reports/expiry-risk", label: "Expiry risk report" },
  { to: "/admin/alerts", label: "Alerts" },
];

const STAFF_NAV_LINKS = [
  { to: "/staff/dashboard", label: "Dashboard" },
  { to: "/orders", label: "Orders" },
  { to: "/orders/new", label: "Place Order" },
];

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function QuickJumpSearch({ role }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Items are only fetched once, the first time the user actually opens
  // the search, rather than on every TopNav mount.
  const loadItems = useCallback(async () => {
    if (itemsLoaded || role !== "admin") return;
    try {
      const data = await api.getItems();
      setItems(data);
    } catch {
      // fail silently — quick jump will just search pages instead
    } finally {
      setItemsLoaded(true);
    }
  }, [itemsLoaded, role]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matchedPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_PAGES.filter((page) => page.label.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const matchedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (item) =>
          item.item_name?.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [items, query]);

  const hasResults = matchedPages.length > 0 || matchedItems.length > 0;

  function goTo(path) {
    navigate(path);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="top-nav__search-wrap" ref={containerRef}>
      <label className="top-nav__search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Quick jump..."
          aria-label="Quick jump"
          value={query}
          onFocus={() => {
            setOpen(true);
            loadItems();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </label>

      {open && query.trim() && (
        <div className="top-nav__search-results" role="listbox">
          {!hasResults && <div className="top-nav__search-empty">No matches for "{query}"</div>}

          {matchedPages.length > 0 && (
            <div className="top-nav__search-group">
              <div className="top-nav__search-group-label">Pages</div>
              {matchedPages.map((page) => (
                <button
                  key={page.to}
                  type="button"
                  className="top-nav__search-item"
                  onClick={() => goTo(page.to)}
                >
                  {page.label}
                </button>
              ))}
            </div>
          )}

          {matchedItems.length > 0 && (
            <div className="top-nav__search-group">
              <div className="top-nav__search-group-label">Items</div>
              {matchedItems.map((item) => (
                <button
                  key={item.item_id}
                  type="button"
                  className="top-nav__search-item"
                  onClick={() => goTo(`/admin/items/${item.item_id}`)}
                >
                  {item.item_name}
                  <span className="top-nav__search-item-meta">{item.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function roleInitial(role) {
  if (!role) return "?";
  return role[0].toUpperCase();
}

function AccountMenu({ role }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // even if the request fails, still send the user to /login below
    } finally {
      setLoggingOut(false);
      setOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="top-nav__account" ref={containerRef}>
      <button
        type="button"
        className="top-nav__avatar"
        title={role ?? "Account"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {roleInitial(role)}
      </button>

      {open && (
        <div className="top-nav__account-menu" role="menu">
          {role && <div className="top-nav__account-role">{role}</div>}
          <button
            type="button"
            role="menuitem"
            className="top-nav__account-item"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  // useCurrentUser() currently exposes { role, isLoading } — no display
  // name yet, so the avatar shows a role initial for now. Swap in real
  // initials once the hook returns a name.
  const { role } = useCurrentUser();
  const [alertCount, setAlertCount] = useState(0);
  const navLinks = role === "staff" ? STAFF_NAV_LINKS : ADMIN_NAV_LINKS;

  const loadAlertCount = useCallback(async () => {
    if (role !== "admin") return; // alerts are admin-only per RoleGuard on AlertsListPage
    try {
      const unresolvedAlerts = await api.getReorderAlerts(false);
      setAlertCount(unresolvedAlerts.length);
    } catch {
      // fail silently — badge just won't show a count
    }
  }, [role]);

  useEffect(() => {
    loadAlertCount();
  }, [loadAlertCount]);

  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <span className="top-nav__logo" aria-hidden="true" />
        <span className="top-nav__wordmark">
          <strong>Walang</strong>Brownout
        </span>
      </div>

      <nav className="top-nav__links" aria-label="Main">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? "top-nav__link top-nav__link--active" : "top-nav__link"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="top-nav__actions">
        <QuickJumpSearch role={role} />

        {role === "admin" && (
          <NavLink to="/admin/alerts" className="top-nav__bell" aria-label="Reorder alerts">
            <BellIcon />
            {alertCount > 0 && (
              <span className="top-nav__badge">{alertCount > 99 ? "99+" : alertCount}</span>
            )}
          </NavLink>
        )}

        <AccountMenu role={role} />
      </div>
    </header>
  );
}