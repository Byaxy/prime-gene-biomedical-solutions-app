"use client";

import RecievingPurchaseForm from "@/components/forms/RecievingPurchaseForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getReceivedPurchaseById } from "@/lib/actions/receivingPurchases.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditReceivedInventory = () => {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getReceivedPurchaseById(id as string);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <Loading />;
  }
  return (
    <PageWraper title="Edit Received Inventory">
      <section className="space-y-6">
        <RecievingPurchaseForm
          mode={"edit"}
          initialData={data ? data : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditReceivedInventory;
