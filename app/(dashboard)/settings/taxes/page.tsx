"use client";

import PageWraper from "@/components/PageWraper";
import { taxColumns } from "@/components/table/columns/taxColumns";
import { DataTable } from "@/components/table/DataTable";
import AddTaxButton from "@/components/taxes/AddTaxButton";
import { useTaxes } from "@/hooks/useTaxes";
import { exportToExcel } from "@/lib/utils";
import { Tax } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";

const Taxes = () => {
  const [rowSelection, setRowSelection] = useState({});

  const {
    taxes,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isFetching,
  } = useTaxes({ initialPageSize: 10 });

  const handleDownloadSelected = async (selectedItems: Tax[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        taxRate: `${item.taxRate}%`,
        code: item.code,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-taxes");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting taxes:", error);
      toast.error("Failed to export taxes");
    }
  };

  return (
    <PageWraper title="Taxes" buttonAction={<AddTaxButton />}>
      <DataTable
        columns={taxColumns}
        data={taxes || []}
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

export default Taxes;
