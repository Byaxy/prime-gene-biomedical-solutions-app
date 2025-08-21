import CustomerForm from "@/components/forms/CustomerForm";
import PageWraper from "@/components/PageWraper";

const AddCustomer = () => {
  return (
    <PageWraper title="Add Customer">
      <CustomerForm mode="create" />
    </PageWraper>
  );
};

export default AddCustomer;
