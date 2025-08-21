"use client";

import WaybillForm from "@/components/forms/WaybillForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getWaybillById } from "@/lib/actions/waybill.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditWaybill = () => {
  const { id } = useParams();

  const { data: waybill, isLoading } = useQuery({
    queryKey: ["waybills"],
    queryFn: async () => {
      if (!id) return null;
      return await getWaybillById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }
  return (
    <PageWraper title="Edit Delivery Note">
      <section className="space-y-6">
        <WaybillForm
          mode={"edit"}
          initialData={waybill ? waybill : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditWaybill;
