import PageWraper from "@/components/PageWraper";
import AdjustInventoryStockTabs from "@/components/inventory/AdjustInventoryStockTabs";
import NewStockFormWrapper from "@/components/inventory/NewStockFormWrapper";
import AdjustStockFormWrapper from "@/components/inventory/AdjustStockFormWrapper";
import { Suspense } from "react";
import FormSkeleton from "@/components/ui/form-skeleton";

const AdjustInventory = () => {
  return (
    <PageWraper title="Adjust Inventory Stock">
      <AdjustInventoryStockTabs
        newStockFormContent={
          <Suspense fallback={<FormSkeleton />}>
            <NewStockFormWrapper />
          </Suspense>
        }
        adjustStockFormContent={
          <Suspense fallback={<FormSkeleton />}>
            <AdjustStockFormWrapper />
          </Suspense>
        }
      />
    </PageWraper>
  );
};

export default AdjustInventory;
