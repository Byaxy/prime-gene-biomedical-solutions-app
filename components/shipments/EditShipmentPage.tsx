"use client";

import { getShipmentById } from "@/lib/actions/shipment.actions";
import { Alert, AlertDescription } from "../ui/alert";
import Loading from "@/app/(dashboard)/loading";
import { useQuery } from "@tanstack/react-query";
import ShipmentForm from "../forms/ShipmentForm";

interface Props {
  shipmentId: string;
}

const EditShipmentPage = ({ shipmentId }: Props) => {
  const {
    data: shipment,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => getShipmentById(shipmentId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load shipment data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <section className="space-y-6">
      <ShipmentForm mode={"edit"} initialData={shipment} />
    </section>
  );
};

export default EditShipmentPage;
