// components/UserListPage.jsx
// Placeholder — no backend endpoint for user management yet, so this uses
// a small hardcoded sample dataset just to show the page working. Swap
// SAMPLE_USERS out for a real api.getUsers() call once that endpoint exists.

import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

const SAMPLE_USERS = [
  { id: 1, username: "jgarcia", name: "Juan Garcia", role: "staff", status: "active" },
  { id: 2, username: "mreyes", name: "Maria Reyes", role: "staff", status: "active" },
  { id: 3, username: "admin", name: "Site Admin", role: "admin", status: "active" },
  { id: 4, username: "dsantos", name: "Diego Santos", role: "staff", status: "inactive" },
];

function UserListPageInner() {
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>User list</h1>
      </div>

      <p className="state-msg">
        Sample data shown below — user management isn't wired to a real backend yet.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_USERS.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.username}</td>
              <td>{user.role}</td>
              <td>
                <span className={user.status === "active" ? "badge" : "badge badge--warning"}>
                  {user.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UserListPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <UserListPageInner />
    </RoleGuard>
  );
}