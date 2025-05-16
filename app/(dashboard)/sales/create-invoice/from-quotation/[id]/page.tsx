"use client";

import SaleForm from "@/components/forms/SaleForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getQuotationById } from "@/lib/actions/quotation.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const CreateInvoiceFromQuotation = () => {
  const { id } = useParams();

  const { data: fetchedQuotation, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getQuotationById(id as string);
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
    <PageWraper title="Create Invoice">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            Converting from Quotation:{" "}
            {fetchedQuotation?.quotation.quotationNumber}
          </p>
        </div>
        <SaleForm
          mode={"create"}
          sourceQuotation={fetchedQuotation || undefined}
        />
      </section>
    </PageWraper>
  );
};

export default CreateInvoiceFromQuotation;
