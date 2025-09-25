import { notFound } from "next/navigation";
import { getProductById, getProducts } from "@/lib/actions/product.actions";
import { getCategories } from "@/lib/actions/category.actions";
import { getBrands } from "@/lib/actions/brand.actions";
import { getUnits } from "@/lib/actions/unit.actions";

import ProductForm from "@/components/forms/ProductForm";
import {
  Category,
  Brand,
  ProductType,
  Unit,
  Product,
  ProductWithRelations,
} from "@/types";
import { getTypes } from "@/lib/actions/type.actions";

interface ProductFormWrapperProps {
  mode: "create" | "edit" | "duplicate";
  productId?: string;
  onCancel?: () => void;
}

export default async function ProductFormWrapper({
  mode,
  productId,
  onCancel,
}: ProductFormWrapperProps) {
  const [categoriesData, typesData, unitsData, brandsData, allProductsData] =
    await Promise.all([
      getCategories(0, 0, true),
      getTypes(0, 0, true),
      getUnits(0, 0, true),
      getBrands(0, 0, true),
      getProducts(0, 0, true),
    ]);

  const categories: Category[] = categoriesData.documents;
  const types: ProductType[] = typesData.documents;
  const units: Unit[] = unitsData.documents;
  const brands: Brand[] = brandsData.documents;
  const allProducts: ProductWithRelations[] = allProductsData.documents;

  let initialData: Product | undefined = undefined;
  if (mode === "edit" || mode === "duplicate") {
    if (!productId) notFound();
    const fetchedProductWithRelations = await getProductById(productId);
    if (!fetchedProductWithRelations) notFound();
    initialData = fetchedProductWithRelations.product;
  }

  return (
    <ProductForm
      mode={mode === "duplicate" ? "create" : mode}
      initialData={initialData}
      categories={categories}
      types={types}
      units={units}
      brands={brands}
      products={allProducts}
      onCancel={onCancel}
    />
  );
}
