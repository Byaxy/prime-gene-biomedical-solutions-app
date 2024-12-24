"use client";

import { useState } from "react";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { useMaterials } from "@/hooks/useMaterials";
import { materialsColumns } from "@/components/table/columns/materialsColumns";
import MaterialDialog from "@/components/materials/MaterialDialog";
import { MaterialFormValues } from "@/lib/validation";

const Materials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { materials, isLoading, addMaterial, isAddingMaterial } =
    useMaterials();

  const handleAddMaterial = async (data: MaterialFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addMaterial(data, {
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
      title="Materials"
      buttonText="Add Material"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={materialsColumns}
          data={materials || []}
          isLoading={isLoading}
        />
        <MaterialDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingMaterial}
          onSubmit={handleAddMaterial}
        />
      </>
    </PageWraper>
  );
};

export default Materials;
