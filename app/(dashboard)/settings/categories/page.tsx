import PageWraper from "@/components/PageWraper";
import dynamic from "next/dynamic";
import { getCategories } from "@/lib/actions/category.actions";
import { Suspense } from "react";
import { CategoryFilters } from "@/hooks/useCategories";
import AddCategoryButton from "@/components/categories/AddCategoryButton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const CategoriesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: CategoryFilters;
}) => {
  const initialData = await getCategories(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const CategoriesTable = dynamic(
    () => import("@/components/categories/CategoriesTable"),
    {
      ssr: true,
    }
  );
  return <CategoriesTable initialData={initialData} />;
};

export interface CategoriesSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Categories = async ({
  searchParams,
}: {
  searchParams: Promise<CategoriesSearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: CategoryFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper title="Categories" buttonAction={<AddCategoryButton />}>
      <Suspense fallback={<TableSkeleton />}>
        <CategoriesTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Categories;
