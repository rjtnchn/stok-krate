// Admin items workspace. The list, the per-item batches view and the create
// form share one page and one header, reached by tab instead of by three
// separate screens — /admin/items, /admin/items/batches and /admin/items/new
// all land here, and the path picks the tab, so the SideNav's "Add item" deep
// link still works.
//
// This is a presentation change only. The admin gate (FR-03, FR-05), the item
// field set and the 422 `sku: already taken` handling all live in the panels,
// unchanged — the guard sits here because all three tabs are admin-only.

import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { RouteTabs } from "@/components/ui/tab-nav";
import ItemsListPanel from "./ItemsListPage";
import BatchesPanel from "./BatchesPanel";
import CreateItemForm from "./CreateItemForm";

const TABS = [
  { key: "items", to: "/admin/items", label: "Items", element: <ItemsListPanel /> },
  { key: "batches", to: "/admin/items/batches", label: "Batches", element: <BatchesPanel /> },
  { key: "new", to: "/admin/items/new", label: "Add item", element: <CreateItemForm /> },
];

export default function ItemsPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <div>
        <PageHeader
          title="Items & batches"
          description="Every SKU tracked in the warehouse, the lots behind each one, and where a new SKU gets added."
        />
        <RouteTabs tabs={TABS} label="Items views" />
      </div>
    </RoleGuard>
  );
}
