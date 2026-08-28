// components/ItemDetailPage.jsx
// Ties together EditItemForm, BatchesList, and ReceiveStockForm for one item.
// Shows how "on 201: refresh batches list" (task 5) is wired to BatchesList (task 4).

import { useParams } from "react-router-dom";
import { useRef } from "react";
import EditItemForm from "./EditItemForm";
import BatchesList from "./BatchesList";
import ReceiveStockForm from "./ReceiveStockForm";
import "../styles/admin.css";

export default function ItemDetailPage() {
  const { itemId } = useParams();
  const batchesRef = useRef(null);

  return (
    <div className="admin-page">
      <EditItemForm />

      <section className="admin-section">
        <h2>Batches</h2>
        <BatchesList ref={batchesRef} itemId={itemId} />
      </section>

      <section className="admin-section">
        <ReceiveStockForm
          itemId={itemId}
          onReceived={() => batchesRef.current?.refresh()}
        />
      </section>
    </div>
  );
}

