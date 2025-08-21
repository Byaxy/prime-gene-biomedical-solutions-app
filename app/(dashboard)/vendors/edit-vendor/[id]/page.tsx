"use client";

import VendorForm from "@/components/forms/VendorForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getVendorById } from "@/lib/actions/vendor.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditVendor = () => {
  const { id } = useParams();

  const { data: vendor, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getVendorById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Inventory">
      <section className="space-y-6">
        <VendorForm
          mode={"edit"}
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
