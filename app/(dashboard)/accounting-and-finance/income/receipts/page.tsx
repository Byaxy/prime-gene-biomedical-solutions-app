import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import React, { Suspense } from "react";

const Receipts = () => {
  return (
    <PageWraper
      title="Receipts"
      buttonText="Generate Receipt"
      buttonPath="/accounting-and-finance/income/receipts/generate-receipt"
    >
      <Suspense fallback={<TableSkeleton />}>
        <div>Receipts Table Component Goes Here</div>
      </Suspense>
    </PageWraper>
  );
};

export default Receipts;
