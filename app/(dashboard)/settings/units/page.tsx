import PageWraper from "@/components/PageWraper";
import { UnitFilters } from "@/hooks/useUnits";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { getUnits } from "@/lib/actions/unit.actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import AddUnitButton from "@/components/units/AddUnitButton";

const UnitsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: UnitFilters;
}) => {
  const initialData = await getUnits(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const UnitsTable = dynamic(() => import("@/components/units/UnitsTable"), {
    ssr: true,
  });
  return <UnitsTable initialData={initialData} />;
};

export interface UnitsSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Units = async ({
  searchParams,
}: {
  searchParams: Promise<UnitsSearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: UnitFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper title="Product Units" buttonAction={<AddUnitButton />}>
      <Suspense fallback={<TableSkeleton />}>
        <UnitsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Units;
