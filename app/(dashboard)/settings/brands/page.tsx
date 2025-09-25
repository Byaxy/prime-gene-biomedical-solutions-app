import PageWraper from "@/components/PageWraper";
import { BrandFilters } from "@/hooks/useBrands";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { getBrands } from "@/lib/actions/brand.actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import AddBrandButton from "@/components/brands/AddBrandButton";

const BrandsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: BrandFilters;
}) => {
  const initialData = await getBrands(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const BrandsTable = dynamic(() => import("@/components/brands/BrandsTable"), {
    ssr: true,
  });
  return <BrandsTable initialData={initialData} />;
};

export interface BrandsSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Brands = async ({
  searchParams,
}: {
  searchParams: Promise<BrandsSearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: BrandFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper title="Product Brands" buttonAction={<AddBrandButton />}>
      <Suspense fallback={<TableSkeleton />}>
        <BrandsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Brands;
