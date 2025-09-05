import PageWraper from "@/components/PageWraper";
import { UnitFilters } from "@/hooks/useUnits";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loading from "../../loading";
import { getUnits } from "@/lib/actions/unit.actions";

const UnitsTable = dynamic(() => import("@/components/units/UnitsTable"));

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

  const initialData = await getUnits(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Product Units"
      buttonText="Add Unit"
      buttonPath="/settings/units?dialog=open"
    >
      <Suspense fallback={<Loading />}>
        <UnitsTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Units;
