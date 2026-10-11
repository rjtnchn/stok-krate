// Admin access workspace: the user list and the create form on one page, by
// tab. /admin/users and /admin/users/new both land here, so the SideNav's
// "Add user" deep link still works.
//
// Presentation only — FR-03 keeps user management admin-only, and the guard
// covers both tabs from here.

import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { RouteTabs } from "@/components/ui/tab-nav";
import UserListPanel from "./UserListPage";
import AddUserPanel from "./AddUserPage";

const TABS = [
  { key: "users", to: "/admin/users", label: "Users", element: <UserListPanel /> },
  { key: "new", to: "/admin/users/new", label: "Add user", element: <AddUserPanel /> },
];

export default function UsersPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <div>
        <PageHeader
          title="Users"
          description="Everyone with access to stok-krate. Demo mode — sample data."
        />
        <RouteTabs tabs={TABS} label="User views" />
      </div>
    </RoleGuard>
  );
}
