"use client";

import PageWraper from "@/components/PageWraper";
import { unitsColumns } from "@/components/table/columns/unitsColumns";
import { DataTable } from "@/components/table/DataTable";
import UnitsDialog from "@/components/units/UnitsDialog";
import { useUnits } from "@/hooks/useUnits";
import { exportToExcel } from "@/lib/utils";
import { UnitFormValues } from "@/lib/validation";
import { Unit } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";

const Units = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    units,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addUnit,
    isAddingUnit,
  } = useUnits({ initialPageSize: 10 });

  const handleAddUnit = async (data: UnitFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addUnit(data, {
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

  const [rowSelection, setRowSelection] = useState({});
  const handleDownloadSelected = async (selectedItems: Unit[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        code: item.code,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-units");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting units:", error);
      toast.error("Failed to export units");
    }
  };

  return (
    <PageWraper
      title="Product Units"
      buttonText="Add Unit"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={unitsColumns}
          data={units || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onDownloadSelected={handleDownloadSelected}
        />
        <UnitsDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingUnit}
          onSubmit={handleAddUnit}
        />
      </>
    </PageWraper>
  );
};

export default Units;
