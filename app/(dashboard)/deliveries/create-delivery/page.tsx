import DeliveryForm from "@/components/forms/DeliveryForm";
import PageWraper from "@/components/PageWraper";

const CreateDelivery = () => {
  return (
    <PageWraper title="Create Delivery Note">
      <section className="space-y-6">
        <DeliveryForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreateDelivery;
