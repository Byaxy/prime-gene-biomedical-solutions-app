"use client";

import DeliveryForm from "@/components/forms/DeliveryForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getDeliveryById } from "@/lib/actions/delivery.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditDelivery = () => {
  const { id } = useParams();

  const { data: delivery, isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      if (!id) return null;
      return await getDeliveryById(id as string);
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
        <DeliveryForm
          mode={"edit"}
          initialData={delivery ? delivery : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditDelivery;
