"use client";

import PageWraper from "@/components/PageWraper";
import { vendorsColumns } from "@/components/table/columns/vendorsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useVendors } from "@/hooks/useVendors";
import { exportToExcel } from "@/lib/utils";
import { Vendor } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";

const Vendors = () => {
  const [rowSelection, setRowSelection] = useState({});

  const {
    vendors,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isFetching,
  } = useVendors({ initialPageSize: 10 });

  const handleDownloadSelected = async (selectedItems: Vendor[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        address: item.address ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-vendors");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting vendors:", error);
      toast.error("Failed to export vendors");
    }
  };

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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onDownloadSelected={handleDownloadSelected}
        refetch={refetch}
        isFetching={isFetching}
      />
    </PageWraper>
  );
};

export default Vendors;
