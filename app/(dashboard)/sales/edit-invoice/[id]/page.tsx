"use client";

import SaleForm from "@/components/forms/SaleForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { useSales } from "@/hooks/useSales";
import { getSaleById } from "@/lib/actions/sale.actions";
import { SaleFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditInvoice = () => {
  const { id } = useParams();
  const { editSale } = useSales();

  const { data: sale, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getSaleById(id as string);
    },
    enabled: !!id,
  });

  const handleEditInvoice = async (data: SaleFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      editSale(
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
        <SaleForm
          mode={"edit"}
          onSubmit={handleEditInvoice}
          initialData={
            sale
              ? {
                  ...sale,
                  customer: sale.customer ? sale.customer.$id : "",
                  saleDate: new Date(sale.saleDate),
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default EditInvoice;
