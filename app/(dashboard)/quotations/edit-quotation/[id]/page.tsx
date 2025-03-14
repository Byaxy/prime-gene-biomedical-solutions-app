"use client";

import QuotationForm from "@/components/forms/QuotationForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { useQuotations } from "@/hooks/useQuotations";
import { getQuotationById } from "@/lib/actions/quotation.actions";
import { QuotationFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditQuotation = () => {
  const { id } = useParams();
  const { editQuotation } = useQuotations();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ["customers", "customer", id],
    queryFn: async () => {
      if (!id) return null;
      return await getQuotationById(id as string);
    },
    enabled: !!id,
  });

  const handleEditInvoice = async (
    data: QuotationFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      editQuotation(
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
    <PageWraper title="Edit Quotation">
      <section className="space-y-6">
        <QuotationForm
          mode={"edit"}
          onSubmit={handleEditInvoice}
          initialData={
            quotation
              ? {
                  ...quotation,
                  customer: quotation.customer ? quotation.customer.$id : "",
                  quotationDate: new Date(quotation.quotationDate),
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default EditQuotation;
