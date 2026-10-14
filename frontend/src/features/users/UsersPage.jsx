// Admin access workspace: the user list and the create form on one page, by
// tab. /admin/users and /admin/users/new both land here, so the SideNav's
// "Add user" deep link still works.
//
// Presentation only — FR-03 keeps user management admin-only, and the guard
// covers both tabs from here.

import { RoleGuard } from "@/api/auth";
import UserListPanel from "./UserListPage";

export default function UsersPage() {
  return (
    <RoleGuard allow={["Admin"]}>
      <UserListPanel />
    </RoleGuard>
  );
}
