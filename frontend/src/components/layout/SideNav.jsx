// The app's single navigation structure — every destination lives here, grouped
// by responsibility, for both roles. TopNav holds identity, search, alerts and
// account only, so there is exactly one place to add or find a page.
//
// From md up this is a permanent 224px rail. Below that it becomes a dialog
// drawer: focus is trapped, Escape closes, background scrolling is locked, the
// panel itself scrolls, and choosing a destination closes it.

import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  ClipboardList,
  PackagePlus,
  Boxes,
  Truck,
  BarChart3,
  TrendingDown,
  CalendarClock,
  ScrollText,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { BrandLockup } from "./BrandMark";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = {
  admin: [
    {
      label: "Overview",
      links: [
        { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/alerts", label: "Alerts", icon: Bell },
      ],
    },
    {
      label: "Operations",
      links: [
        { to: "/orders", label: "Orders", icon: ClipboardList },
        { to: "/orders/new", label: "Place order", icon: PackagePlus },
        { to: "/receive", label: "Receive stock", icon: Truck },
      ],
    },
    {
      label: "Inventory",
      links: [
        { to: "/admin/items", label: "Items & batches", icon: Boxes },
        { to: "/admin/items/new", label: "Add item", icon: PackagePlus },
      ],
    },
    {
      label: "Reports",
      links: [
        { to: "/admin/reports/stock-levels", label: "Stock levels", icon: BarChart3 },
        { to: "/admin/reports/shrinkage", label: "Shrinkage", icon: TrendingDown },
        { to: "/admin/reports/expiry-risk", label: "Expiry risk", icon: CalendarClock },
        { to: "/admin/audit-summary", label: "Transaction ledger", icon: ScrollText },
      ],
    },
    {
      label: "Access",
      links: [
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/users/new", label: "Add user", icon: UserPlus },
      ],
    },
  ],
  staff: [
    {
      label: "Overview",
      links: [{ to: "/staff/dashboard", label: "My dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Operations",
      links: [
        { to: "/orders", label: "Orders", icon: ClipboardList },
        { to: "/orders/new", label: "Place order", icon: PackagePlus },
        { to: "/receive", label: "Receive stock", icon: Truck },
      ],
    },
  ],
};

export function navSectionsFor(role) {
  return NAV_SECTIONS[role] ?? [];
}

// Flat { to, label } list for TopNav's quick jump, so search coverage can never
// drift from the navigation itself.
export function navPagesFor(role) {
  return navSectionsFor(role).flatMap((section) =>
    section.links.map((link) => ({ to: link.to, label: link.label }))
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SideNav({ role, open = false, onClose, returnFocusRef }) {
  const panelRef = useRef(null);
  const sections = navSectionsFor(role);

  // Escape to close, focus trapped inside the panel, focus returned to the
  // menu button, and the page behind held still — drawer behaviour only.
  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    // Captured now so cleanup restores focus to the button that opened the
    // drawer, regardless of what the ref points at by then.
    const trigger = returnFocusRef?.current;
    panel?.querySelector("[data-drawer-close]")?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      const items = Array.from(panel?.querySelectorAll(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (sections.length === 0) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/55 md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        id="main-nav"
        ref={panelRef}
        aria-label="Main navigation"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={cn(
          "w-56 shrink-0 border-r border-shell-line bg-shell md:flex md:self-stretch md:flex-col",
          open
            ? "fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto md:static md:inset-auto md:z-auto md:overflow-visible"
            : "hidden"
        )}
      >
        {/* Drawer-only header: identity plus an always-reachable close control. */}
        <div className="flex h-14 items-center justify-between gap-2 border-b border-shell-line px-3 md:hidden">
          <BrandLockup />
          <button
            type="button"
            data-drawer-close
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-onshell-dim hover:bg-shell-3 hover:text-onshell"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 px-2 py-3">
          {sections.map((section) => (
            <div className="mb-3 last:mb-0" key={section.label}>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-onshell-dim/70">
                {section.label}
              </div>
              <nav className="flex flex-col gap-px">
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] font-medium",
                        isActive
                          ? "bg-shell-3 text-onshell"
                          : "text-onshell-dim hover:bg-shell-2 hover:text-onshell"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active rail: teal marks the current route without
                            relying on text colour alone. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-4 w-0.5 shrink-0 rounded-full",
                            isActive ? "bg-signal-bright" : "bg-transparent"
                          )}
                        />
                        <link.icon size={15} strokeWidth={2} className="shrink-0" />
                        <span className="truncate">{link.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
