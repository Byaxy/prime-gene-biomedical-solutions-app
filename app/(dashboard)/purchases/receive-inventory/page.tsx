import RecievingPurchaseForm from "@/components/forms/RecievingPurchaseForm";
import PageWraper from "@/components/PageWraper";

const ReceiveInventory = () => {
  return (
    <PageWraper title="Receive Inventory">
      <section className="space-y-6">
        <RecievingPurchaseForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default ReceiveInventory;
