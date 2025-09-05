import PageWraper from "@/components/PageWraper";
import dynamic from "next/dynamic";
import { getCategories } from "@/lib/actions/category.actions";
import { Suspense } from "react";
import Loading from "../../loading";
import { CategoryFilters } from "@/hooks/useCategories";

const CategoriesTable = dynamic(
  () => import("@/components/categories/CategoriesTable")
);

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

  const initialData = await getCategories(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Categories"
      buttonText="Add Category"
      buttonPath="/settings/categories?dialog=open"
    >
      <Suspense fallback={<Loading />}>
        <CategoriesTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Categories;
