// FR-08 — Staff-reachable stock receipt. Lists items with action buttons
// to Receive stock or View batches in modals.

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import ReceiveStockForm from "./ReceiveStockForm";
import BatchesList from "./BatchesList";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

const CATEGORY_TONE = { A: "ink", B: "outline", C: "neutral" };

function ReceiveStockPageInner() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [receivingItem, setReceivingItem] = useState(null);
  const [batchesItem, setBatchesItem] = useState(null);
  const batchesRef = useRef(null);

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
    <div className="space-y-4">
      <PageHeader
        title="Receive stock"
        description="Log a delivery against an item. Each receipt writes a stock transaction under your name."
      />

      {status === "loading" && <TableSkeleton columns={6} rows={5} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load items.{" "}
          <button onClick={loadItems} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && (
        items.length === 0 ? (
          <EmptyState>No items available to receive stock.</EmptyState>
        ) : (
          <Table minWidth={800}>
            <THead>
              <Tr>
                <Th>SKU</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>ABC</Th>
                <Th>Reorder point</Th>
                <Th className="text-right">Actions</Th>
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
                  <Td>{item.reorder_point}</Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setBatchesItem(item)}>
                        Batches
                      </Button>
                      <Button variant="signal" size="sm" onClick={() => setReceivingItem(item)}>
                        Receive stock
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )
      )}

      {/* Receive Stock Modal */}
      {receivingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">Receive stock: {receivingItem.name}</h3>
                  <p className="code text-xs text-steel">{receivingItem.sku}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setReceivingItem(null)}>
                  Close
                </Button>
              </div>
              <ReceiveStockForm
                itemId={receivingItem.id}
                onReceived={() => {
                  batchesRef.current?.refresh();
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batches Modal */}
      {batchesItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{batchesItem.name}</h3>
                  <p className="code text-xs text-steel">{batchesItem.sku}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setBatchesItem(null)}>
                  Close
                </Button>
              </div>
              <BatchesList ref={batchesRef} itemId={batchesItem.id} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ReceiveStockPage() {
  return (
    <RoleGuard allow={["Admin", "Staff"]}>
      <ReceiveStockPageInner />
    </RoleGuard>
  );
}
