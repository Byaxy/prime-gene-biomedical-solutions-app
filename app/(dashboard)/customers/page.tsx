import CustomersTable from "@/components/customers/CustomersTable";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import { getCustomers } from "@/lib/actions/customer.actions";
import { CustomerFilters } from "@/hooks/useCustomers";

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Customers = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: CustomerFilters = {
    search: sp.search || undefined,
  };

  const initialData = await getCustomers(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Customers"
      buttonText="Add Customer"
      buttonPath="/customers/add-customer"
    >
      <Suspense fallback={<Loading />}>
        <CustomersTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Customers;
