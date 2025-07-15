"use client";

import { useQuotations } from "@/hooks/useQuotations";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { quotationsColumns } from "@/components/table/columns/quotationsColumns";
import { QuotationStatus, QuotationWithRelations } from "@/types";
import { useState } from "react";
import QuotationDialog from "@/components/quotations/QuotationsDialog";

const Quotations = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(
    {} as QuotationWithRelations
  );
  const {
    quotations,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange,
    defaultFilterValues,
    refetch,
    isRefetching,
  } = useQuotations({ initialPageSize: 10 });

  const handleRowClick = (rowData: QuotationWithRelations) => {
    setSelectedSale(rowData);
    setOpenDialog(true);
  };

  const quotationFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    quotationDate: {
      type: "date" as const,
      label: "Quotation Date",
    },
    status: {
      type: "select" as const,
      label: "Quotation Status",
      options: Object.values(QuotationStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    convertedToSale: {
      type: "boolean" as const,
      label: "Converted to Sale",
    },
  };

  return (
    <PageWraper
      title="Quotations"
      buttonText="Add Quotation"
      buttonPath="/quotations/create-quotation"
    >
      <>
        <DataTable
          columns={quotationsColumns}
          data={quotations || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={quotationFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
          searchBy={[
            "quotation.quotationNumber",
            "customer.name",
            "quotation.rfqNumber",
          ]}
          refetch={refetch}
          isRefetching={isRefetching}
        />
        <QuotationDialog
          mode={"view"}
          open={openDialog && !!selectedSale}
          onOpenChange={setOpenDialog}
          quotation={selectedSale}
        />
      </>
    </PageWraper>
  );
};

export default Quotations;
