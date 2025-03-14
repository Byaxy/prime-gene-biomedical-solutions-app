"use client";

import { useState } from "react";
import PageWraper from "@/components/PageWraper";
import VendorDialog from "@/components/vendors/VendorDialog";
import { vendorsColumns } from "@/components/table/columns/vendorsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useVendors } from "@/hooks/useVendors";
import { VendorFormValues } from "@/lib/validation";

const Vendors = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    vendors,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addVendor,
    isAddingVendor,
  } = useVendors({ initialPageSize: 10 });

  const handleAddVendor = async (data: VendorFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addVendor(data, {
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
      title="Vendors"
      buttonText="Add Vendor"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
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

        <VendorDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingVendor}
          onSubmit={handleAddVendor}
        />
      </>
    </PageWraper>
  );
};

export default Vendors;
