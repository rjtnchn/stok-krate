// Admin access workspace: the user list and the create form on one page, by
// tab. /admin/users and /admin/users/new both land here, so the SideNav's
// "Add user" deep link still works.
//
// Presentation only — FR-03 keeps user management admin-only, and the guard
// covers both tabs from here.

import { useLocation } from "react-router-dom";
import { RoleGuard } from "@/api/auth";
import UserListPanel from "./UserListPage";
import AddUserPanel from "./AddUserPage";

export default function UsersPage() {
  const location = useLocation();
  const isNew = location.pathname.includes("/new");

  return (
    <RoleGuard allow={["Admin"]}>
      {isNew ? <AddUserPanel /> : <UserListPanel />}
    </RoleGuard>
  );
}
