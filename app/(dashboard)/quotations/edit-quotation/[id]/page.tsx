"use client";

import QuotationForm from "@/components/forms/QuotationForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getQuotationById } from "@/lib/actions/quotation.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditQuotation = () => {
  const { id } = useParams();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ["quotations", id],
    queryFn: async () => {
      if (!id) return null;
      return await getQuotationById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Quotation">
      <section className="space-y-6">
        <QuotationForm
          mode={"edit"}
          initialData={quotation ? quotation : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditQuotation;
