"use client";

import { ProductFormValidation, ProductFormValues } from "@/lib/validation";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form, FormControl } from "../ui/form";
import { useState } from "react";
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
import Loading from "../loading";
import { Brand, Product, ProductType, Unit } from "@/types";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Product;
  onSubmit: (data: ProductFormValues, prevImageId?: string) => Promise<void>;
}
const ProductForm = ({ mode, initialData, onSubmit }: ProductFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { categories, isLoading: categoriesLoading } = useCategories({
    getAllCategories: true,
  });
  const { types } = useTypes({ getAllTypes: true });
  const { units } = useUnits({ getAllUnits: true });
  const { brands } = useBrands({ getAllBrands: true });

  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormValidation),
    defaultValues: initialData || {
      name: "",
      alertQuantity: 1,
      categoryId: "",
      typeId: "",
      brandId: "",
      unitId: "",
      description: "",
      quantity: 0,
      image: [],
    },
  });

  const handleSubmit = async (values: ProductFormValues) => {
    console.log("Product values", values);

    setIsLoading(true);
    try {
      if (
        mode === "edit" &&
        values?.image &&
        values?.image.length > 0 &&
        initialData?.imageId
      ) {
        await onSubmit(values, initialData?.imageId);
      } else {
        await onSubmit(values);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create flattened categories with indentation
  const flattenedCategories = categories
    ? getFlattenedCategories(categories)
    : [];

  return (
    <Form {...form}>
      <form
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

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Product Name"
          placeholder="Enter product name"
        />

        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="categoryId"
            label="Category"
            placeholder="Select category"
            onAddNew={() => router.push("/settings/categories")}
            hideSearch={true}
          >
            {categoriesLoading && (
              <div className="py-5">
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
            onAddNew={() => router.push("/settings/brands")}
          >
            {brands?.map((brand: Brand) => (
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
            onAddNew={() => router.push("/settings/types")}
          >
            {types?.map((productType: ProductType) => (
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
            onAddNew={() => router.push("/settings/units")}
          >
            {units?.map((unit: Unit) => (
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

        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.NUMBER}
            control={form.control}
            name="quantity"
            label="Quantity At Hand"
            placeholder="Enter quantity at hand"
          />

          <CustomFormField
            fieldType={FormFieldType.NUMBER}
            control={form.control}
            name="alertQuantity"
            label="Alert Quantity"
            placeholder="Enter alert quantity"
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
            onClick={() => form.reset()}
            className="shad-danger-btn"
          >
            Cancel
          </Button>

          <SubmitButton isLoading={isLoading} className="shad-primary-btn">
            {mode === "create" ? "Create Product" : "Update Product"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
