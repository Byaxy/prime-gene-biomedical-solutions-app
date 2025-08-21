"use client";

import PurchaseOrderForm from "@/components/forms/PurchaseOrderForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getPurchaseOrderById } from "@/lib/actions/purchaseOrder.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import React from "react";

const EditPurchaseOrder = () => {
  const { id } = useParams();

  const { data: purchaseOrder, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getPurchaseOrderById(id as string);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Invoice">
      <section className="space-y-6">
        <PurchaseOrderForm
          mode={"edit"}
          initialData={purchaseOrder ? purchaseOrder : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditPurchaseOrder;
