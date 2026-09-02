// Graphite shell around a warm neutral workspace. The sidebar is a permanent
// rail from md up and a focus-trapped drawer below it; AppLayout owns the open
// state and the menu-button ref so focus can return there on close.

import { useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useCurrentUser } from "@/api/auth";
import TopNav from "./TopNav";
import SideNav from "./SideNav";

export default function AppLayout() {
  const { role } = useCurrentUser();
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef(null);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <TopNav
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((o) => !o)}
        menuButtonRef={menuButtonRef}
      />
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-stretch">
        <SideNav
          role={role}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          returnFocusRef={menuButtonRef}
        />
        <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
