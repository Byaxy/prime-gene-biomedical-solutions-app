"use client";

import VendorForm from "@/components/forms/VendorForm";
import PageWraper from "@/components/PageWraper";
import { useVendors } from "@/hooks/useVendors";
import { VendorFormValues } from "@/lib/validation";

const AddVendor = () => {
  const { addVendor } = useVendors();
  const handleAddVendor = async (data: VendorFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addVendor(data, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <PageWraper title="Add Vendor">
      <section className="space-y-6">
        <VendorForm mode={"create"} onSubmit={handleAddVendor} />
      </section>
    </PageWraper>
  );
};

export default AddVendor;
