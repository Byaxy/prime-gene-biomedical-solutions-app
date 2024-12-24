"use client";

import ColorDialog from "@/components/colors/ColorDialog";
import PageWraper from "@/components/PageWraper";
import { colorColumns } from "@/components/table/columns/colorColumns";
import { DataTable } from "@/components/table/DataTable";
import { useColors } from "@/hooks/useColors";
import { ColorFormValues } from "@/lib/validation";
import { useState } from "react";

const Colors = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { productColors, isLoading, addColor, isAddingColor } = useColors();

  const handleAddColor = async (data: ColorFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addColor(data, {
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
      title="Product Colors"
      buttonText="Add Color"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={colorColumns}
          data={productColors || []}
          isLoading={isLoading}
        />
        <ColorDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingColor}
          onSubmit={handleAddColor}
        />
      </>
    </PageWraper>
  );
};

export default Colors;
