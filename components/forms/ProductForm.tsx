"use client";

import { ProductFormValidation, ProductFormValues } from "@/lib/validation";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form, FormControl } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { SelectItem } from "../ui/select";
import { FileUploader } from "../FileUploader";
import { useRouter } from "next/navigation";
import {
  Brand,
  Category,
  Product,
  ProductType,
  ProductWithRelations,
  Unit,
} from "@/types";
import { useProducts } from "@/hooks/useProducts";
import toast from "react-hot-toast";
import { CategoryDialog } from "../categories/CategoryDialog";
import BrandDialog from "../brands/BrandDialog";
import UnitsDialog from "../units/UnitsDialog";
import ProductTypeDialog from "../productTypes/ProductTypeDialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFlattenedCategories } from "./CategoriesForm";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Product;
  categories: Category[];
  types: ProductType[];
  units: Unit[];
  brands: Brand[];
  products: ProductWithRelations[];
  onCancel?: () => void;
}
const ProductForm = ({
  mode,
  initialData,
  categories,
  types,
  units,
  brands,
  products,
  onCancel,
}: ProductFormProps) => {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  const { addProduct, editProduct, isAddingProduct, isEditingProduct } =
    useProducts({ getAllProducts: true });

  const router = useRouter();
  const initialMount = useRef(true);

  const defaultValues = useMemo(
    () => ({
      productID: "",
      name: "",
      alertQuantity: 1,
      maxAlertQuantity: 1,
      categoryId: "",
      typeId: undefined,
      brandId: "",
      unitId: "",
      description: "",
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      image: [],
    }),
    []
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormValidation),
    defaultValues: defaultValues,
  });

  // Set initial form values
  useEffect(() => {
    if (initialMount.current) {
      if (initialData) {
        form.reset({
          productID: initialData.productID,
          name: initialData.name,
          alertQuantity: initialData.alertQuantity,
          maxAlertQuantity: initialData.maxAlertQuantity,
          categoryId: initialData.categoryId,
          typeId: initialData.typeId,
          brandId: initialData.brandId,
          unitId: initialData.unitId,
          description: initialData.description,
          quantity: initialData.quantity,
          costPrice: initialData.costPrice,
          sellingPrice: initialData.sellingPrice,
          image: initialData.imageUrl
            ? [
                {
                  id: initialData.imageId,
                  url: initialData.imageUrl,
                  name: "",
                  size: 0,
                  type: "",
                },
              ]
            : [],
        });
      }
      initialMount.current = false;
    }
  }, [initialData, form]);

  // handle close dialog
  const closeDialog = useCallback(() => {
    setCategoryDialogOpen(false);
    setBrandDialogOpen(false);
    setUnitDialogOpen(false);
    setTypeDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      const loadingToastId = toast.loading(
        mode === "create" ? "Creating product..." : "Updating product..."
      );

      try {
        if (mode === "create") {
          const existingProduct = products.find(
            (product: ProductWithRelations) =>
              product.product.productID === values.productID.trim()
          );

          if (existingProduct) {
            toast.error("Product ID already exists", { id: loadingToastId });
            return;
          }

          await addProduct(values, {
            onSuccess: () => {
              toast.success("Product created successfully!", {
                id: loadingToastId,
              });

              if (onCancel) {
                onCancel();
              } else {
                router.push("/inventory");
                router.refresh();
              }
              form.reset(defaultValues);
            },
          });
        }
        if (mode === "edit" && initialData) {
          if (initialData?.productID !== values.productID) {
            const existingProduct = products.find(
              (product: ProductWithRelations) =>
                product.product.productID === values.productID.trim()
            );

            if (existingProduct) {
              toast.error("Product ID already exists", { id: loadingToastId });
              return;
            }
          }

          // Ensure `initialData.id` is available for edit
          if (!initialData?.id) {
            throw new Error("Product ID is required for editing.");
          }

          if (
            values?.image &&
            values?.image.length > 0 &&
            initialData?.imageId
          ) {
            await editProduct(
              {
                id: initialData.id,
                data: values,
                prevImageId: initialData?.imageId,
              },
              {
                onSuccess: () => {
                  toast.success("Product updated successfully!", {
                    id: loadingToastId,
                  });

                  if (onCancel) {
                    onCancel();
                  } else {
                    router.push("/inventory");
                    router.refresh();
                  }
                  form.reset(defaultValues);
                },
              }
            );
          } else {
            await editProduct(
              {
                id: initialData?.id ?? "",
                data: values,
              },
              {
                onSuccess: () => {
                  toast.success("Product updated successfully!", {
                    id: loadingToastId,
                  });

                  if (onCancel) {
                    onCancel();
                  } else {
                    router.push("/inventory");
                    router.refresh();
                  }
                  form.reset(defaultValues);
                },
              }
            );
          }
        }
      } catch (error) {
        console.error("Product operation error:", error);
        toast.error(
          `Failed to ${mode === "create" ? "create" : "update"} product`,
          { id: loadingToastId }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  // Flatten categories for display
  const flattenedCategories = categories
    ? getFlattenedCategories(categories)
    : [];

  const isAnyMutationLoading = isAddingProduct || isEditingProduct;

  return (
    <>
      <Form {...form}>
        <form
          id="product-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5 text-dark-500"
        >
          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="image"
            label="Image"
            disabled={isAnyMutationLoading}
            renderSkeleton={(field) => (
              <FormControl>
                <FileUploader
                  files={field.value}
                  onChange={field.onChange}
                  mode={mode}
                  currentImageUrl={initialData?.imageUrl}
                  disabled={isAnyMutationLoading}
                />
              </FormControl>
            )}
          />
          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="productID"
              label="Product ID"
              placeholder="Enter product ID"
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="name"
              label="Product Name"
              placeholder="Enter product name"
              disabled={isAnyMutationLoading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="categoryId"
              label="Category"
              placeholder="Select category"
              onAddNew={() => setCategoryDialogOpen(true)}
              key={`category-select-${form.watch("categoryId") || ""}`}
              disabled={isAnyMutationLoading}
            >
              {categories &&
                flattenedCategories &&
                flattenedCategories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={category.id}
                    className="text-14-medium cursor-pointer hover:bg-blue-800 hover:text-white"
                    style={{ paddingLeft: `${category.depth * 20}px` }}
                  >
                    {category.name}
                  </SelectItem>
                ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="brandId"
              label="Brand"
              placeholder="Select brand"
              onAddNew={() => setBrandDialogOpen(true)}
              key={`brand-select-${form.watch("brandId") || ""}`}
              disabled={isAnyMutationLoading}
            >
              {brands &&
                brands?.map((brand: Brand) => (
                  <SelectItem
                    key={brand.id}
                    value={brand.id}
                    className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {brand.name}
                  </SelectItem>
                ))}
            </CustomFormField>
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="typeId"
              label="Type"
              placeholder="Select product type"
              onAddNew={() => setTypeDialogOpen(true)}
              key={`type-select-${form.watch("typeId") || ""}`}
              disabled={isAnyMutationLoading}
            >
              {types &&
                types?.map((productType: ProductType) => (
                  <SelectItem
                    key={productType.id}
                    value={productType.id}
                    className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {productType.name}
                  </SelectItem>
                ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="unitId"
              label="Unit of Measure"
              placeholder="Select unit of measure"
              onAddNew={() => setUnitDialogOpen(true)}
              key={`unit-select-${form.watch("unitId") || ""}`}
              disabled={isAnyMutationLoading}
            >
              {units &&
                units?.map((unit: Unit) => (
                  <SelectItem
                    key={unit.id}
                    value={unit.id}
                    className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {unit.name} ({unit.code})
                  </SelectItem>
                ))}
            </CustomFormField>
          </div>

          <div className="flex w-full flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="costPrice"
              label="Cost Price"
              placeholder="Enter cost price"
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="sellingPrice"
              label="Selling Price"
              placeholder="Enter selling price"
              disabled={isAnyMutationLoading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.NUMBER}
              control={form.control}
              name="alertQuantity"
              label="Min Reoder Level"
              placeholder="Enter min reoder level"
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.NUMBER}
              control={form.control}
              name="maxAlertQuantity"
              label="Max Reoder Level"
              placeholder="Enter max reoder level"
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.NUMBER}
              control={form.control}
              name="quantity"
              label="Quantity At Hand"
              placeholder="Enter quantity at hand"
              disabled
            />
          </div>

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter product description"
            disabled={isAnyMutationLoading}
          />

          <div className="flex justify-end gap-4 py-5">
            <Button
              type="button"
              onClick={() => {
                form.reset();
                onCancel?.();
              }}
              className="shad-danger-btn"
              disabled={isAnyMutationLoading}
            >
              Cancel
            </Button>

            <SubmitButton
              isLoading={isAddingProduct || isEditingProduct}
              className="shad-primary-btn"
              disabled={isAnyMutationLoading}
            >
              {mode === "create" ? "Create Product" : "Update Product"}
            </SubmitButton>
          </div>
        </form>
      </Form>
      {/* Dialogs */}
      <CategoryDialog
        mode="add"
        open={categoryDialogOpen}
        onOpenChange={closeDialog}
      />

      <BrandDialog
        mode="add"
        open={brandDialogOpen}
        onOpenChange={closeDialog}
      />
      <UnitsDialog
        mode="add"
        open={unitDialogOpen}
        onOpenChange={closeDialog}
      />
      <ProductTypeDialog
        mode="add"
        open={typeDialogOpen}
        onOpenChange={closeDialog}
      />
    </>
  );
};

export default ProductForm;
