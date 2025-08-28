"use client";

import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { usePurchases } from "@/hooks/usePurchases";
import { purchasesColumns } from "@/components/table/columns/purchasesColumns";
import { useState } from "react";
import { PurchaseStatus, PurchaseWithRelations } from "@/types";
import { PurchaseDialog } from "@/components/purchases/PurchaseDialog";
import PurchasesOverview from "@/components/purchases/PurchasesOverview";

const Purchases = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(
    {} as PurchaseWithRelations
  );
  const {
    purchases,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    refetch,
    isRefetching,
    filters,
    onFilterChange,
    defaultFilterValues,
  } = usePurchases({ initialPageSize: 10 });

  const { purchases: allPurchases, isLoading: isLoadingAllPurchases } =
    usePurchases({
      getAllPurchases: true,
    });

  const handleRowClick = (rowData: PurchaseWithRelations) => {
    setSelectedPurchase(rowData);
    setOpenDialog(true);
  };

  const purchaseFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    purchaseDate: {
      type: "date" as const,
      label: "Purchase Date",
    },
    status: {
      type: "select" as const,
      label: "Purchase Status",
      options: Object.values(PurchaseStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
  };

  return (
    <PageWraper
      title="Purchases"
      buttonText="Add Purchase"
      buttonPath="/purchases/create-purchase"
    >
      <>
        <PurchasesOverview
          purchases={allPurchases || []}
          isLoading={isLoadingAllPurchases}
        />

        <DataTable
          columns={purchasesColumns}
          data={purchases || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={["purchase.purchaseNumber", "vendor.name"]}
          refetch={refetch}
          isRefetching={isRefetching}
          filters={purchaseFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
        />
        <PurchaseDialog
          mode={"view"}
          open={openDialog && !!selectedPurchase}
          onOpenChange={setOpenDialog}
          purchase={selectedPurchase}
        />
      </>
    </PageWraper>
  );
};

export default Purchases;
