"use client";

import PurchaseForm from "@/components/forms/PurchaseForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getPurchaseById } from "@/lib/actions/purchase.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditPurchase = () => {
  const { id } = useParams();

  const { data: purchase, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getPurchaseById(id as string);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Invoice">
      <section className="space-y-6">
        <PurchaseForm
          mode={"edit"}
          initialData={
            purchase
              ? {
                  ...purchase,
                  vendor: purchase.vendor ? purchase.vendor.$id : "",
                  purchaseDate: new Date(purchase.purchaseDate),
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default EditPurchase;
