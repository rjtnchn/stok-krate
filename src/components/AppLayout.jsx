// components/AppLayout.jsx
// Wraps every route except /login with the shared TopNav, plus SideNav
// for admin users only (staff has no sidebar per the mockup).

import { Outlet } from "react-router-dom";
import { useCurrentUser } from "../api/auth";
import TopNav from "./TopNav";
import SideNav from "./SideNav";
import "../styles/app-layout.css";

export default function AppLayout() {
  const { role } = useCurrentUser();

  return (
    <>
      <TopNav />
      <div className="app-layout__body">
        {role === "admin" && <SideNav />}
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>
    </>
  );
}