import { QuotationFilters } from "@/hooks/useQuotations";
import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getQuotations } from "@/lib/actions/quotation.actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const QuotationsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: QuotationFilters;
}) => {
  const initialData = await getQuotations(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const QuotationsTable = dynamic(
    () => import("@/components/quotations/QuotationsTable")
  );
  return <QuotationsTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  quotationDate_start?: string;
  quotationDate_end?: string;
  status?: string;
  convertedToSale?: boolean;
}

const Quotations = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: QuotationFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    quotationDate_start: sp.quotationDate_start || undefined,
    quotationDate_end: sp.quotationDate_end || undefined,
    status: sp.status || undefined,
    convertedToSale: sp.convertedToSale || undefined,
  };

  return (
    <PageWraper
      title="Quotations"
      buttonText="Add Quotation"
      buttonPath="/quotations/create-quotation"
    >
      <Suspense fallback={<TableSkeleton />}>
        <QuotationsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Quotations;
