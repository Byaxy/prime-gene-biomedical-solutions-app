"use client";

import SaleForm from "@/components/forms/SaleForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getSaleById } from "@/lib/actions/sale.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditInvoice = () => {
  const { id } = useParams();

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      if (!id) return null;
      return await getSaleById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Invoice">
      <section className="space-y-6">
        <SaleForm mode={"edit"} initialData={sale ? sale : undefined} />
      </section>
    </PageWraper>
  );
};

export default EditInvoice;
