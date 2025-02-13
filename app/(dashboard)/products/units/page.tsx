"use client";

import PageWraper from "@/components/PageWraper";
import { unitsColumns } from "@/components/table/columns/unitsColumns";
import { DataTable } from "@/components/table/DataTable";
import UnitsDialog from "@/components/units/UnitsDialog";
import { useUnits } from "@/hooks/useUnits";
import { UnitFormValues } from "@/lib/validation";
import { useState } from "react";

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
