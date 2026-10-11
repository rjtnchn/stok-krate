// FR-05 — the Items tab of the items workspace: table of all items from
// GET /api/items. ItemsPage owns the page header, the tab strip and the admin
// role guard, so this file is just the panel.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

// ABC turnover class is a classification, not a warning — it stays neutral.
const CATEGORY_TONE = { A: "ink", B: "outline", C: "neutral" };

function ItemsTable({ items }) {
  if (items.length === 0) {
    return <EmptyState>No items yet. Add one from the Add item tab.</EmptyState>;
  }

  return (
    <Table minWidth={900}>
      <THead>
        <Tr>
          <Th>SKU</Th>
          <Th>Name</Th>
          <Th>Category</Th>
          <Th>ABC</Th>
          <Th>Seasonal</Th>
          <Th>Reorder point</Th>
          <Th>Sf</Th>
          <Th aria-label="Actions" />
        </Tr>
      </THead>
      <TBody>
        {items.map((item) => (
          <Tr key={item.id}>
            <Td className="code text-[12px] text-steel">{item.sku}</Td>
            <Td className="font-medium">{item.name}</Td>
            <Td className="text-steel">{item.category}</Td>
            <Td>
              <Badge tone={CATEGORY_TONE[item.turnover_category] || "neutral"}>
                {item.turnover_category}
              </Badge>
            </Td>
            <Td>{item.seasonal_flag ? "Yes" : "No"}</Td>
            <Td>{item.reorder_point}</Td>
            <Td>{Number(item.current_sf).toFixed(2)}</Td>
            <Td>
              <Link to={`/admin/items/${item.id}`} className="text-sm font-semibold text-ink underline">
                View / Edit
              </Link>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export default function ItemsListPanel() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const loadItems = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getItems();
      setItems(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <>
      {status === "loading" && <TableSkeleton columns={8} rows={5} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load items.{" "}
          <button onClick={loadItems} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && <ItemsTable items={items} />}
    </>
  );
}
