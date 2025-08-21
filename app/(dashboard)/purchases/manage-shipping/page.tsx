import ShipmentForm from "@/components/forms/ShipmentForm";
import PageWraper from "@/components/PageWraper";

const ManageShippingPage = () => {
  return (
    <PageWraper title="Create New Shipment">
      <ShipmentForm mode="create" />
    </PageWraper>
  );
};

export default ManageShippingPage;
