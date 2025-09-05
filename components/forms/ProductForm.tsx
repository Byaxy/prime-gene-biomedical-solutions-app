"use client";

import {
  BrandFormValues,
  CategoryFormValues,
  ProductFormValidation,
  ProductFormValues,
  TypeFormValues,
  UnitFormValues,
} from "@/lib/validation";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form, FormControl } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { useCategories } from "@/hooks/useCategories";
import { SelectItem } from "../ui/select";
import { useTypes } from "@/hooks/useTypes";
import { useUnits } from "@/hooks/useUnits";
import { FileUploader } from "../FileUploader";
import { useRouter } from "next/navigation";
import { useBrands } from "@/hooks/useBrands";
import { getFlattenedCategories } from "./CategoriesForm";
import Loading from "../../app/(dashboard)/loading";
import {
  Brand,
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
import { useState } from "react";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Product;
  onCancel?: () => void;
}
const ProductForm = ({ mode, initialData, onCancel }: ProductFormProps) => {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const {
    categories,
    isLoading: categoriesLoading,
    addCategory,
    isAddingCategory,
  } = useCategories({
    getAllCategories: true,
  });
  const {
    types,
    isLoading: typesLoading,
    addType,
    isAddingType,
  } = useTypes({ getAllTypes: true });
  const {
    units,
    isLoading: unitsLoading,
    addUnit,
    isAddingUnit,
  } = useUnits({ getAllUnits: true });
  const {
    brands,
    isLoading: brandsLoading,
    addBrand,
    isAddingBrand,
  } = useBrands({
    getAllBrands: true,
  });
  const {
    products,
    addProduct,
    editProduct,
    isAddingProduct,
    isEditingProduct,
  } = useProducts({ getAllProducts: true });

  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormValidation),
    defaultValues: initialData || {
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
    },
  });

  // handle close dialog
  const closeDialog = () => {
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
  };

  // Handlers for adding new items
  const handleAddCategory = async (data: CategoryFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addCategory(data, {
        onSuccess: () => {
          closeDialog();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleAddBrand = async (data: BrandFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addBrand(data, {
        onSuccess: () => {
          closeDialog();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleAddUnit = async (data: UnitFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addUnit(data, {
        onSuccess: () => {
          closeDialog();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleAddType = async (data: TypeFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addType(data, {
        onSuccess: () => {
          closeDialog();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      if (mode === "create") {
        const existingProduct = products.find(
          (product: ProductWithRelations) =>
            product.product.productID === values.productID.trim()
        );

        if (existingProduct) {
          toast.error("Product ID already exists");
          return;
        }

        await addProduct(values, {
          onSuccess: () => {
            toast.success("Inventory Added successfully!");
            form.reset();
            onCancel?.();
            router.push("/inventory");
          },
          onError: (error) => {
            console.error("Submission error:", error);
            toast.error(error.message || "Failed to add inventory stock");
          },
        });
      }
      if (mode === "edit") {
        if (initialData?.productID !== values.productID) {
          const existingProduct = products.find(
            (product: ProductWithRelations) =>
              product.product.productID === values.productID.trim()
          );

          if (existingProduct) {
            toast.error("Product ID already exists");
            return;
          }
        }

        if (values?.image && values?.image.length > 0 && initialData?.imageId) {
          await editProduct(
            {
              id: initialData.id,
              data: values,
              prevImageId: initialData?.imageId,
            },
            {
              onSuccess: () => {
                toast.success("Inventory edited successfully!");
                form.reset();
                router.push("/inventory");
              },
              onError: (error) => {
                console.error("Submission error:", error);
                toast.error(error.message || "Failed to edit inventory stock");
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
                toast.success("Inventory edited successfully!");
                form.reset();
                router.push("/inventory");
              },
              onError: (error) => {
                console.error("Submission error:", error);
                toast.error(error.message || "Failed to edit inventory stock");
              },
            }
          );
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  // Create flattened categories with indentation
  const flattenedCategories = categories
    ? getFlattenedCategories(categories)
    : [];

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
            renderSkeleton={(field) => (
              <FormControl>
                <FileUploader
                  files={field.value}
                  onChange={field.onChange}
                  mode={mode}
                  currentImageUrl={initialData?.imageUrl}
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
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="name"
              label="Product Name"
              placeholder="Enter product name"
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
              hideSearch={true}
            >
              {categoriesLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
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
            >
              {brandsLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
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
            >
              {typesLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
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
            >
              {unitsLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
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
            />
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="sellingPrice"
              label="Selling Price"
              placeholder="Enter selling price"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.NUMBER}
              control={form.control}
              name="alertQuantity"
              label="Min Reoder Level"
              placeholder="Enter min reoder level"
            />
            <CustomFormField
              fieldType={FormFieldType.NUMBER}
              control={form.control}
              name="maxAlertQuantity"
              label="Max Reoder Level"
              placeholder="Enter max reoder level"
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
          />

          <div className="flex justify-end gap-4 py-5">
            <Button
              type="button"
              onClick={() => {
                form.reset();
                onCancel?.();
              }}
              className="shad-danger-btn"
            >
              Cancel
            </Button>

            <SubmitButton
              isLoading={isAddingProduct || isEditingProduct}
              className="shad-primary-btn"
            >
              {mode === "create" ? "Create Product" : "Update Product"}
            </SubmitButton>
          </div>
        </form>
      </Form>
      {/* Dialogs */}
      <CategoryDialog
        mode="add"
        onSubmit={handleAddCategory}
        open={categoryDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingCategory}
      />

      <BrandDialog
        mode="add"
        onSubmit={handleAddBrand}
        open={brandDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingBrand}
      />
      <UnitsDialog
        mode="add"
        onSubmit={handleAddUnit}
        open={unitDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingUnit}
      />
      <ProductTypeDialog
        mode="add"
        onSubmit={handleAddType}
        open={typeDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingType}
      />
    </>
  );
};

export default ProductForm;
