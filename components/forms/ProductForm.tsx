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
import {
  Vendor,
  Category,
  Product,
  ProductType,
  Unit,
} from "@/types/appwrite.types";
import { SelectItem } from "../ui/select";
import { useTypes } from "@/hooks/useTypes";
import { useUnits } from "@/hooks/useUnits";
import { FileUploader } from "../FileUploader";
import { useVendors } from "@/hooks/useVendors";
import { useProducts } from "@/hooks/useProducts";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Product;
  onSubmit: (data: ProductFormValues, prevImageId?: string) => Promise<void>;
}
const ProductForm = ({ mode, initialData, onSubmit }: ProductFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { categories } = useCategories({ getAllCategories: true });
  const { types } = useTypes({ getAllTypes: true });
  const { units } = useUnits({ getAllUnits: true });
  const { vendors } = useVendors({ getAllVendors: true });
  const { products } = useProducts({ getAllProducts: true });

  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormValidation),
    defaultValues: initialData || {
      name: "",
      lotNumber: "",
      description: "",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      category: "",
      vendor: "",
      type: "",
      unit: "",
      image: [],
    },
  });

  const handleSubmit = async (values: ProductFormValues) => {
    setIsLoading(true);
    try {
      const existingProduct = products?.find(
        (product: Product) => product.lotNumber === values.lotNumber
      );
      if (existingProduct && mode === "create") {
        toast.error("A product with the same lot number already exists.");
        return;
      }

      if (mode === "edit" && initialData?.lotNumber !== values.lotNumber) {
        const existingProduct = products?.find(
          (product: Product) => product.lotNumber === values.lotNumber
        );
        if (existingProduct) {
          toast.error("A product with the same lot number already exists.");
          return;
        }
      }

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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 text-dark-500 lg:max-w-5xl"
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
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="lotNumber"
            label="Lot Number"
            placeholder="Enter product lot number"
          />

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="vendor"
            label="Vendor"
            placeholder="Select vendor"
            onAddNew={() => router.push("/vendors/add-vendor")}
          >
            {vendors?.map((vendor: Vendor) => (
              <SelectItem
                key={vendor.$id}
                value={vendor.$id}
                className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {vendor.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="category"
            label="Category"
            placeholder="Select category"
            onAddNew={() => router.push("/settings/categories")}
          >
            {categories?.map((category: Category) => (
              <SelectItem
                key={category.$id}
                value={category.$id}
                className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {category.name}
              </SelectItem>
            ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="type"
            label="Type"
            placeholder="Select type"
            onAddNew={() => router.push("/settings/types")}
          >
            {types?.map((productType: ProductType) => (
              <SelectItem
                key={productType.$id}
                value={productType.$id}
                className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {productType.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="costPrice"
            label="Cost Price"
            placeholder="Enter product cost price"
          />

          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="sellingPrice"
            label="Selling Price"
            placeholder="Enter product selling price"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.NUMBER}
            control={form.control}
            name="quantity"
            label="Quantity"
            placeholder="Enter quantity in stock"
          />

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="unit"
            label="Unit of Measure"
            placeholder="Select unit of measure"
            onAddNew={() => router.push("/settings/units")}
          >
            {units?.map((unit: Unit) => (
              <SelectItem
                key={unit.$id}
                value={unit.$id}
                className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {unit.name} ({unit.code})
              </SelectItem>
            ))}
          </CustomFormField>
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
