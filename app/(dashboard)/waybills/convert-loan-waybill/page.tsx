"use client";

import ConvertLoanWaybillForm from "@/components/forms/ConvertLoanWaybillForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getSaleById } from "@/lib/actions/sale.actions";
import { getWaybillById } from "@/lib/actions/waybill.actions";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

const ConvertLoanWaybill = () => {
  const searchParams = useSearchParams();

  const waybillId = searchParams.get("waybillId");
  const saleId = searchParams.get("saleId");

  const { data: waybill, isLoading: isWaybillLoading } = useQuery({
    queryKey: ["waybills"],
    queryFn: async () => {
      if (!waybillId) return null;
      return await getWaybillById(waybillId as string);
    },
    enabled: !!waybillId,
    staleTime: 0,
  });

  const { data: sale, isLoading: isSaleLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      if (!saleId) return null;
      return await getSaleById(saleId as string);
    },
    enabled: !!saleId,
    staleTime: 0,
  });

  if (isWaybillLoading || isSaleLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Convert Loan Waybill">
      <section className="space-y-6">
        {(!waybillId || !saleId) && (
          <div className="bg-red-600/10 px-5 py-4 rounded-md">
            <p className="text-red-600 font-medium">
              ⚠️ Error: Missing waybillId or saleId in query parameters.
            </p>
          </div>
        )}

        {sale && waybill ? (
          <ConvertLoanWaybillForm waybill={waybill} sale={sale} />
        ) : null}
      </section>
    </PageWraper>
  );
};

export default ConvertLoanWaybill;
