import WaybillForm from "@/components/forms/WaybillForm";
import PageWraper from "@/components/PageWraper";

const CreateWaybill = () => {
  return (
    <PageWraper title="Create Waybill">
      <section className="space-y-6">
        <WaybillForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreateWaybill;
