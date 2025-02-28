"use client";

import { useState } from "react";
import { useQuotations } from "@/hooks/useQuotations";
import { QuotationFormValues } from "@/lib/validation";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { quotationsColumns } from "@/components/table/columns/quotationsColumns";
import QuotationSheet from "@/components/quotations/QuotationSheet";

const Quotations = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    quotations,
    addQuotation,
    isLoading,
    isAddingQuotation,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useQuotations({ initialPageSize: 10 });

  const handleCreateQuotation = async (
    data: QuotationFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      addQuotation(data, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <PageWraper
      title="Quotations"
      buttonText="Add Quotation"
      buttonAction={() => setIsAddDialogOpen(true)}
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
          searchBy="quotationNumber"
        />

        <QuotationSheet
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingQuotation}
          onSubmit={handleCreateQuotation}
        />
      </>
    </PageWraper>
  );
};

export default Quotations;
