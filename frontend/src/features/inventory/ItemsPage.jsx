import { RoleGuard } from "@/api/auth";
import ItemsListPanel from "./ItemsListPage";

export default function ItemsPage() {
  return (
    <RoleGuard allow={["Admin"]}>
      <ItemsListPanel />
    </RoleGuard>
  );
}
