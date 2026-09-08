// Compact 56px graphite strip: identity, quick jump, Admin alert access, account.
// It holds no navigation links of its own — every destination lives in SideNav's
// config, which this file reads for quick jump so the two cannot drift apart.

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import { api } from "@/api/client";
import { useCurrentUser } from "@/api/auth";
import { navPagesFor } from "./SideNav";
import { BrandLockup } from "./BrandMark";
import { cn } from "@/lib/utils";

function QuickJumpSearch({ role }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const searchablePages = useMemo(() => navPagesFor(role), [role]);

  const loadItems = useCallback(async () => {
    if (itemsLoaded || !role) return;
    try {
      const data = await api.getItems();
      setItems(data);
    } catch {
      // fail silently — quick jump still searches pages
    } finally {
      setItemsLoaded(true);
    }
  }, [itemsLoaded, role]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matchedPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchablePages.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 5);
  }, [query, searchablePages]);

  const matchedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((i) => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [items, query]);

  const hasResults = matchedPages.length > 0 || matchedItems.length > 0;

  function goTo(path) {
    navigate(path);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative hidden sm:block" ref={containerRef}>
      <label className="flex h-8 w-52 items-center gap-2 rounded-md border border-shell-line bg-shell-2 px-2.5 text-onshell-dim focus-within:border-signal-bright">
        <Search size={13} aria-hidden="true" />
        <input
          type="text"
          placeholder="Jump to page or SKU…"
          aria-label="Quick jump to a page or item"
          className="w-full bg-transparent text-[13px] text-onshell outline-none placeholder:text-onshell-dim/70"
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
        <div
          role="listbox"
          aria-label="Quick jump results"
          className="absolute right-0 z-40 mt-1 w-72 overflow-hidden rounded-md border border-line bg-white shadow-sm"
        >
          {!hasResults && (
            <div className="px-3 py-2.5 text-[13px] text-steel">No matches for “{query}”</div>
          )}

          {matchedPages.length > 0 && (
            <div className="border-b border-line py-1 last:border-b-0">
              <div className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel-soft">
                Pages
              </div>
              {matchedPages.map((page) => (
                <button
                  key={page.to}
                  type="button"
                  className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-ink hover:bg-paper-dim"
                  onClick={() => goTo(page.to)}
                >
                  {page.label}
                </button>
              ))}
            </div>
          )}

          {matchedItems.length > 0 && (
            <div className="py-1">
              <div className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel-soft">
                Items
              </div>
              {matchedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px] text-ink hover:bg-paper-dim"
                  onClick={() => goTo(`/admin/items/${item.id}`)}
                >
                  <span className="truncate">{item.name}</span>
                  <span className="code text-[11px] text-steel-soft">{item.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ role }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } finally {
      setLoggingOut(false);
      setOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-shell-line px-2 text-[12px] font-semibold text-onshell hover:bg-shell-3"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-signal-bright/20 text-[9px] font-bold text-signal-bright">
          {role ? role[0].toUpperCase() : "?"}
        </span>
        <span className="capitalize">{role ?? "Account"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-md border border-line bg-white py-1 shadow-sm"
        >
          <div className="border-b border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel-soft">
            Signed in · {role}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-paper-dim disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopNav({ navOpen = false, onToggleNav, menuButtonRef }) {
  const { role } = useCurrentUser();
  const [alertCount, setAlertCount] = useState(0);

  const loadAlertCount = useCallback(async () => {
    if (role !== "admin") return;
    try {
      const [reorder, expiry] = await Promise.all([
        api.getReorderAlerts(false),
        api.getExpiryAlerts(false),
      ]);
      setAlertCount(reorder.length + expiry.length);
    } catch {
      // fail silently — the badge simply shows no count
    }
  }, [role]);

  useEffect(() => {
    loadAlertCount();
  }, [loadAlertCount]);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-shell-line bg-shell px-3 md:px-4">
      {role && (
        <button
          type="button"
          ref={menuButtonRef}
          onClick={onToggleNav}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="main-nav"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-onshell-dim hover:bg-shell-3 hover:text-onshell md:hidden"
        >
          <Menu size={18} />
        </button>
      )}

      <BrandLockup />

      <div className="ml-auto flex items-center gap-2">
        <QuickJumpSearch role={role} />

        {role === "admin" && (
          <NavLink
            to="/admin/alerts"
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-md border border-shell-line px-2 text-[12px] font-semibold",
              alertCount > 0
                ? "bg-rust/15 text-rust-bg"
                : "text-onshell-dim hover:bg-shell-3 hover:text-onshell"
            )}
          >
            <Bell size={14} aria-hidden="true" />
            <span className="num">{alertCount}</span>
            <span className="sr-only">active alerts</span>
            <span aria-hidden="true" className="hidden sm:inline">
              active
            </span>
          </NavLink>
        )}

        <AccountMenu role={role} />
      </div>
    </header>
  );
}
