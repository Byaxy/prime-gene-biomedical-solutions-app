"use client";

import { getDeliveryById } from "@/lib/actions/delivery.actions";
import DeliveryForm from "../forms/DeliveryForm";
import Loading from "../../app/(dashboard)/loading";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "../ui/alert";

interface Props {
  deliveryId: string;
}

const EditDeliveryPage = ({ deliveryId }: Props) => {
  const {
    data: delivery,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["delivery", deliveryId],
    queryFn: () => getDeliveryById(deliveryId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load delivery data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <Loading />;
  }
  return (
    <section className="space-y-6">
      <DeliveryForm mode={"edit"} initialData={delivery} />
    </section>
  );
};

export default EditDeliveryPage;
