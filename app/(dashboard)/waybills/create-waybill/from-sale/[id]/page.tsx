"use client";

import WaybillForm from "@/components/forms/WaybillForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getSaleById } from "@/lib/actions/sale.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const CreateWaybillFromSale = () => {
  const { id } = useParams();

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      if (!id) return null;
      return await getSaleById(id as string);
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
    <PageWraper title="Create Waybill">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            Creating for Sale: {sale.sale.invoiceNumber}
          </p>
        </div>
        <WaybillForm mode="create" sourceSale={sale} />
      </section>
    </PageWraper>
  );
};

export default CreateWaybillFromSale;
