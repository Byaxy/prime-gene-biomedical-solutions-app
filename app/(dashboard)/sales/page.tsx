"use client";

import { useSales } from "@/hooks/useSales";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { salesColumns } from "@/components/table/columns/salesColumns";
import SaleDialog from "@/components/sales/SaleDialog";
import { useState } from "react";
import { PaymentStatus, SaleStatus, SaleWithRelations } from "@/types";
import SalesOverview from "@/components/sales/SalesOverview";

const Sales = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState({} as SaleWithRelations);
  const {
    sales,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange,
    defaultFilterValues,
  } = useSales({ initialPageSize: 10 });

  const handleRowClick = (rowData: SaleWithRelations) => {
    setSelectedSale(rowData);
    setOpenDialog(true);
  };

  const salesFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    amountPaid: {
      type: "number" as const,
      label: "Amount Paid",
    },
    saleDate: {
      type: "date" as const,
      label: "Sale Date",
    },
    status: {
      type: "select" as const,
      label: "Sale Status",
      options: Object.values(SaleStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    paymentStatus: {
      type: "select" as const,
      label: "Payment Status",
      options: Object.values(PaymentStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
  };

  return (
    <PageWraper
      title="Sales"
      buttonText="Create Invoice"
      buttonPath="/sales/create-invoice"
    >
      <>
        <SalesOverview sales={sales || []} isLoading={isLoading} />

        <DataTable
          columns={salesColumns}
          data={sales || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={["sale.invoiceNumber", "customer.name"]}
          onRowClick={handleRowClick}
          filters={salesFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
        />
        <SaleDialog
          mode={"view"}
          open={openDialog && !!selectedSale}
          onOpenChange={setOpenDialog}
          sale={selectedSale}
        />
      </>
    </PageWraper>
  );
};

export default Sales;
