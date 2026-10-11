// Orders workspace: the order history and the place-order form on one page, by
// tab. /orders and /orders/new both land here, so the SideNav's "Place order"
// deep link still works.
//
// No role guard, matching the routes this replaces: both roles place orders,
// and the API is what filters admin-sees-all from staff-sees-own.

import { PageHeader } from "@/components/ui/page-header";
import { RouteTabs } from "@/components/ui/tab-nav";
import OrdersListPanel from "./OrdersListPage";
import PlaceOrderForm from "./PlaceOrderForm";

const TABS = [
  { key: "orders", to: "/orders", label: "Orders", element: <OrdersListPanel /> },
  { key: "new", to: "/orders/new", label: "Place order", element: <PlaceOrderForm /> },
];

export default function OrdersPage() {
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order placed against the warehouse, most recent first — and the form to place another."
      />
      <RouteTabs tabs={TABS} label="Order views" />
    </div>
  );
}
