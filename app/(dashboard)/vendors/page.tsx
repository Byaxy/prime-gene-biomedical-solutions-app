"use client";

import PageWraper from "@/components/PageWraper";
import { vendorsColumns } from "@/components/table/columns/vendorsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useVendors } from "@/hooks/useVendors";

const Vendors = () => {
  const {
    vendors,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useVendors({ initialPageSize: 10 });

  return (
    <PageWraper
      title="Vendors"
      buttonText="Add Vendor"
      buttonPath="/vendors/add-vendor"
    >
      <DataTable
        columns={vendorsColumns}
        data={vendors || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </PageWraper>
  );
};

export default Vendors;
