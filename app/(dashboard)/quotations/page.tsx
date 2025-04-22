"use client";

import { useQuotations } from "@/hooks/useQuotations";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { quotationsColumns } from "@/components/table/columns/quotationsColumns";

const Quotations = () => {
  const {
    quotations,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useQuotations({ initialPageSize: 10 });

  return (
    <PageWraper
      title="Quotations"
      buttonText="Add Quotation"
      buttonPath="/quotations/create-quotation"
    >
      <DataTable
        columns={quotationsColumns}
        data={quotations || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchBy={["quotation.quotationNumber", "customer.name"]}
      />
    </PageWraper>
  );
};

export default Quotations;
