import { Suspense } from "react";
import PageWraper from "@/components/PageWraper";
import { TypeFilters } from "@/hooks/useTypes";
import dynamic from "next/dynamic";
import { getTypes } from "@/lib/actions/type.actions";
import AddTypeButton from "@/components/productTypes/AddTypeButton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const ProductTypesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: TypeFilters;
}) => {
  const initialData = await getTypes(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const ProductTypesTable = dynamic(
    () => import("@/components/productTypes/ProductTypesTable"),
    {
      ssr: true,
    }
  );
  return <ProductTypesTable initialData={initialData} />;
};

export interface TypesSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Types = async ({
  searchParams,
}: {
  searchParams: Promise<TypesSearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: TypeFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper title="Product Types" buttonAction={<AddTypeButton />}>
      <Suspense fallback={<TableSkeleton />}>
        <ProductTypesTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Types;
