// The Users tab of the access workspace. UsersPage owns the page header, the
// tab strip and the admin role guard.
//
// Placeholder — no backend endpoint for user management yet, so this uses
// a small hardcoded sample dataset. Swap SAMPLE_USERS for a real
// api.getUsers() call once that endpoint exists.

import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";

const SAMPLE_USERS = [
  { id: 1, username: "jgarcia", name: "Juan Garcia", role: "staff", status: "active" },
  { id: 2, username: "mreyes", name: "Maria Reyes", role: "staff", status: "active" },
  { id: 3, username: "acruz", name: "Ana Cruz", role: "staff", status: "active" },
  { id: 4, username: "admin", name: "Site Admin", role: "admin", status: "active" },
  { id: 5, username: "dsantos", name: "Diego Santos", role: "staff", status: "inactive" },
];

export default function UserListPanel() {
  return (
    <div>
      <Table>
        <THead>
          <Tr>
            <Th>Name</Th>
            <Th>Username</Th>
            <Th>Role</Th>
            <Th>Status</Th>
          </Tr>
        </THead>
        <TBody>
          {SAMPLE_USERS.map((user) => (
            <Tr key={user.id}>
              <Td className="font-medium">{user.name}</Td>
              <Td className="code text-[12px] text-steel">{user.username}</Td>
              <Td>
                <Badge tone={user.role === "admin" ? "ink" : "neutral"} className="capitalize">
                  {user.role}
                </Badge>
              </Td>
              <Td>
                <Badge tone={user.status === "active" ? "good" : "neutral"} className="capitalize">
                  {user.status}
                </Badge>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
