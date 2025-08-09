"use client";

import PurchaseForm from "@/components/forms/PurchaseForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getPurchaseOrderById } from "@/lib/actions/purchaseOrder.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const CreatePurchaseFromPurchaseOrder = () => {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getPurchaseOrderById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Create Purchase">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            Converting Purchase Order: {data?.purchaseOrder.purchaseOrderNumber}
          </p>
        </div>
        <PurchaseForm mode={"create"} sourcePurchaseOrder={data || undefined} />
      </section>
    </PageWraper>
  );
};

export default CreatePurchaseFromPurchaseOrder;
