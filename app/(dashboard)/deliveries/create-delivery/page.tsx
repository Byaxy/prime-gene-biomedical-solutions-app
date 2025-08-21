import DeliveryForm from "@/components/forms/DeliveryForm";
import PageWraper from "@/components/PageWraper";

const CreateDelivery = () => {
  return (
    <PageWraper title="Create Delivery Note">
      <DeliveryForm mode={"create"} />
    </PageWraper>
  );
};

export default CreateDelivery;
