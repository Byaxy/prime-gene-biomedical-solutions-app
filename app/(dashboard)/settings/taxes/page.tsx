import PageWraper from "@/components/PageWraper";
import AddTaxButton from "@/components/taxes/AddTaxButton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { TaxFilters } from "@/hooks/useTaxes";
import { getTaxes } from "@/lib/actions/tax.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TaxesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: TaxFilters;
}) => {
  const initialData = await getTaxes(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const TaxesTable = dynamic(() => import("@/components/taxes/TaxesTable"));
  return <TaxesTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Taxes = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: TaxFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper title="Taxes" buttonAction={<AddTaxButton />}>
      <Suspense fallback={<TableSkeleton />}>
        <TaxesTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Taxes;
