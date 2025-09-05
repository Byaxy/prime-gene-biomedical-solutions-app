import PageWraper from "@/components/PageWraper";
import { BrandFilters } from "@/hooks/useBrands";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loading from "../../loading";
import { getBrands } from "@/lib/actions/brand.actions";

const BrandsTable = dynamic(() => import("@/components/brands/BrandsTable"));

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

  const initialData = await getBrands(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Product Brands"
      buttonText="Add Brand"
      buttonPath="/settings/brands?dialog=open"
    >
      <Suspense fallback={<Loading />}>
        <BrandsTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Brands;
