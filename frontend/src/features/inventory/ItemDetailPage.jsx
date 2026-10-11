// Ties together EditItemForm, BatchesList, and ReceiveStockForm for one item.

import { useParams } from "react-router-dom";
import { useRef } from "react";
import EditItemForm from "./EditItemForm";
import BatchesList from "./BatchesList";
import ReceiveStockForm from "./ReceiveStockForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ItemDetailPage() {
  const { itemId } = useParams();
  const batchesRef = useRef(null);

  return (
    <div className="space-y-4">
      <EditItemForm />

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchesList ref={batchesRef} itemId={itemId} />
        </CardContent>
      </Card>

      <ReceiveStockForm itemId={itemId} onReceived={() => batchesRef.current?.refresh()} />
    </div>
  );
}
