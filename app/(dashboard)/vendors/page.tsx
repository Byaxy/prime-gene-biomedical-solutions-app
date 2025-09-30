import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { VendorFilters } from "@/hooks/useVendors";
import { getVendors } from "@/lib/actions/vendor.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const VendorsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: VendorFilters;
}) => {
  const initialData = await getVendors(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const VendorsTable = dynamic(
    () => import("@/components/vendors/VendorsTable")
  );
  return <VendorsTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Vendors = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: VendorFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper
      title="Vendors"
      buttonText="Add Vendor"
      buttonPath="/vendors/add-vendor"
    >
      <Suspense fallback={<TableSkeleton />}>
        <VendorsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Vendors;
