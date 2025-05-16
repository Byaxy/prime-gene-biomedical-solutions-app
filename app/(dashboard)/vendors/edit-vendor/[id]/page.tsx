"use client";

import VendorForm from "@/components/forms/VendorForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { useVendors } from "@/hooks/useVendors";
import { getVendorById } from "@/lib/actions/vendor.actions";
import { VendorFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditVendor = () => {
  const { id } = useParams();
  const { editVendor } = useVendors();

  const { data: vendor, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getVendorById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  const handleEditVendor = async (data: VendorFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      editVendor(
        { id: id as string, data },
        {
          onSuccess: () => {
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Inventory">
      <section className="space-y-6">
        <VendorForm
          mode={"edit"}
          onSubmit={handleEditVendor}
          initialData={
            vendor
              ? {
                  ...vendor,
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default EditVendor;
