// components/SideNav.jsx
// Admin-only left sidebar. Rendered by AppLayout alongside TopNav when the
// current user's role is "admin".

import { NavLink } from "react-router-dom";
import "../styles/side-nav.css";

const SECTIONS = [
  {
    label: "Users",
    links: [
      { to: "/admin/users", label: "User list" },
      { to: "/admin/users/new", label: "Add user" },
    ],
  },
  {
    label: "Items & batches",
    links: [
      { to: "/admin/items", label: "Item & batch list" },
      { to: "/admin/items/new", label: "Add item" },
      { to: "/admin/batches/new", label: "Add batch" },
    ],
  },
  {
    label: "Reports",
    links: [
      { to: "/admin/activity-log", label: "Activity log" },
      { to: "/admin/audit-summary", label: "Audit summary" },
    ],
  },
];

export default function SideNav() {
  return (
    <aside className="side-nav" aria-label="Admin sections">
      {SECTIONS.map((section) => (
        <div className="side-nav__section" key={section.label}>
          <div className="side-nav__section-label">{section.label}</div>
          <nav className="side-nav__links">
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? "side-nav__link side-nav__link--active" : "side-nav__link"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
}