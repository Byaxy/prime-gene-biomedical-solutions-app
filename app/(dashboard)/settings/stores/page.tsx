import PageWraper from "@/components/PageWraper";
import { StoreFilters } from "@/hooks/useStores";
import { Suspense } from "react";
import AddStoreButton from "@/components/stores/AddStoreButton";
import dynamic from "next/dynamic";
import { getStores } from "@/lib/actions/store.actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const StoreTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: StoreFilters;
}) => {
  const initialData = await getStores(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const StoreTable = dynamic(() => import("@/components/stores/StoreTable"));
  return <StoreTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Stores = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: StoreFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper title="Stores" buttonAction={<AddStoreButton />}>
      <Suspense fallback={<TableSkeleton />}>
        <StoreTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Stores;
