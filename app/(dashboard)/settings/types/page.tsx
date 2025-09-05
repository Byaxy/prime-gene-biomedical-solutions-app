import { Suspense } from "react";
import PageWraper from "@/components/PageWraper";
import { TypeFilters } from "@/hooks/useTypes";
import dynamic from "next/dynamic";
import Loading from "../../loading";
import { getTypes } from "@/lib/actions/type.actions";

const ProductTypesTable = dynamic(
  () => import("@/components/productTypes/ProductTypesTable")
);

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

  const initialData = await getTypes(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Product Types"
      buttonText="Add Type"
      buttonPath="/settings/types?dialog=open"
    >
      <Suspense fallback={<Loading />}>
        <ProductTypesTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Types;
