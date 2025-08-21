"use client";

import { getSaleById } from "@/lib/actions/sale.actions";
import { useQuery } from "@tanstack/react-query";
import Loading from "../../app/(dashboard)/loading";
import DeliveryForm from "../forms/DeliveryForm";
import { Alert, AlertDescription } from "../ui/alert";

interface Props {
  saleId: string;
}

const CreateDeliveryFromSalePage = ({ saleId }: Props) => {
  const {
    data: sale,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => getSaleById(saleId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load sale data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <section className="space-y-6">
      <div className="bg-blue-50 px-5 py-4 rounded-md">
        <p className="text-blue-800 font-medium">
          Creating for Sale: {sale.sale.invoiceNumber}
        </p>
      </div>
      <DeliveryForm mode="create" sourceSale={sale} />
    </section>
  );
};

export default CreateDeliveryFromSalePage;
