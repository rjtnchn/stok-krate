import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import OrdersListPanel from "./OrdersListPage";
import PlaceOrderForm from "./PlaceOrderForm";

export default function OrdersPage() {
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOrderPlaced = useCallback(() => {
    setShowPlaceModal(false);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div>
      <PageHeader
        title="Orders"
        actions={
          <Button variant="signal" size="sm" onClick={() => setShowPlaceModal(true)}>
            Place order
          </Button>
        }
      />

      {showPlaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-ink">Place order</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPlaceModal(false)}>
                  Close
                </Button>
              </div>
              <PlaceOrderForm
                onOrderPlaced={handleOrderPlaced}
                onCancel={() => setShowPlaceModal(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <OrdersListPanel key={refreshKey} />
    </div>
  );
}
