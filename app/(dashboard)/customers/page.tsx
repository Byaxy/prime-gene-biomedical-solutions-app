import CustomersTable from "@/components/customers/CustomersTable";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";

const Customers = () => {
  return (
    <PageWraper
      title="Customers"
      buttonText="Add Customer"
      buttonPath="/customers/add-customer"
    >
      <Suspense fallback={<Loading />}>
        <CustomersTable />
      </Suspense>
    </PageWraper>
  );
};

export default Customers;
