import PageWraper from "@/components/PageWraper";
import { ProductFilters } from "@/hooks/useProducts";
import { getProducts } from "@/lib/actions/product.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loading from "../loading";

const InventoryTable = dynamic(
  () => import("@/components/inventory/InventoryTable")
);

export interface InventorySearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  isActive?: "true" | "false" | "all";
  categoryId?: string;
  brandId?: string;
  typeId?: string;
  unitId?: string;
  costPrice_min?: string;
  costPrice_max?: string;
  sellingPrice_min?: string;
  sellingPrice_max?: string;
  quantity_min?: string;
  quantity_max?: string;
}

const Inventory = async ({
  searchParams,
}: {
  searchParams: Promise<InventorySearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: ProductFilters = {
    search: sp.search || undefined,
    isActive: sp.isActive || undefined,
    categoryId: sp.categoryId || undefined,
    brandId: sp.brandId || undefined,
    typeId: sp.typeId || undefined,
    unitId: sp.unitId || undefined,
    costPrice_min: sp.costPrice_min ? Number(sp.costPrice_min) : undefined,
    costPrice_max: sp.costPrice_max ? Number(sp.costPrice_max) : undefined,
    sellingPrice_min: sp.sellingPrice_min
      ? Number(sp.sellingPrice_min)
      : undefined,
    sellingPrice_max: sp.sellingPrice_max
      ? Number(sp.sellingPrice_max)
      : undefined,
    quantity_min: sp.quantity_min ? Number(sp.quantity_min) : undefined,
    quantity_max: sp.quantity_max ? Number(sp.quantity_max) : undefined,
  };

  const initialData = await getProducts(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Inventory List"
      buttonText="Add New"
      buttonPath="/inventory/add-inventory"
    >
      <Suspense fallback={<Loading />}>
        <InventoryTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Inventory;
