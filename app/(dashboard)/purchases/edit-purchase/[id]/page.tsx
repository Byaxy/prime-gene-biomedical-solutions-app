"use client";

import PurchaseForm from "@/components/forms/PurchaseForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { usePurchases } from "@/hooks/usePurchases";
import { getPurchaseById } from "@/lib/actions/purchase.actions";
import { PurchaseFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditPurchase = () => {
  const { id } = useParams();
  const { editPurchase } = usePurchases();

  const { data: purchase, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getPurchaseById(id as string);
    },
    enabled: !!id,
  });

  const handleEditPurchase = async (
    data: PurchaseFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      editPurchase(
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
    <PageWraper title="Edit Invoice">
      <section className="space-y-6">
        <PurchaseForm
          mode={"edit"}
          onSubmit={handleEditPurchase}
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
