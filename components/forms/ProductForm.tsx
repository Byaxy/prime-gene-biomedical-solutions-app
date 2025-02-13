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
  Categories,
  Colors,
  Materials,
  Product,
  ProductTypes,
  Unit,
} from "@/types/appwrite.types";
import { SelectItem } from "../ui/select";
import { useTypes } from "@/hooks/useTypes";
import { useMaterials } from "@/hooks/useMaterials";
import { useColors } from "@/hooks/useColors";
import { useUnits } from "@/hooks/useUnits";
import { FileUploader } from "../FileUploader";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Product;
  onSubmit: (data: ProductFormValues, prevImageId?: string) => Promise<void>;
  onCancel?: () => void;
}
const ProductForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: ProductFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { categories } = useCategories({ getAllCategories: true });
  const { types } = useTypes({ getAllTypes: true });
  const { units } = useUnits({ getAllUnits: true });
  const { materials } = useMaterials({ getAllMaterials: true });
  const { productColors } = useColors({ getAllColors: true });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormValidation),
    defaultValues: initialData || {
      name: "",
      description: "",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      categoryId: "",
      typeId: "",
      materialId: "",
      colorId: "",
      unitId: "",
      image: [],
    },
  });

  const handleSubmit = async (values: ProductFormValues) => {
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
          label="Profile Image"
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
            name="unitId"
            label="Unit of Measure"
            placeholder="Select unit of measure"
          >
            {units?.map((unit: Unit) => (
              <SelectItem
                key={unit.$id}
                value={unit.$id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {unit.name} ({unit.code})
              </SelectItem>
            ))}
          </CustomFormField>
        </div>
        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="categoryId"
            label="Category"
            placeholder="Select category"
          >
            {categories?.map((category: Categories) => (
              <SelectItem
                key={category.$id}
                value={category.$id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {category.name}
              </SelectItem>
            ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="typeId"
            label="Type"
            placeholder="Select type"
          >
            {types?.map((productType: ProductTypes) => (
              <SelectItem
                key={productType.$id}
                value={productType.$id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {productType.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="colorId"
            label="Color"
            placeholder="Select color"
          >
            {productColors?.map((color: Colors) => (
              <SelectItem
                key={color.$id}
                value={color.$id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <span>{color.name}</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color.code }}
                  />
                </div>
              </SelectItem>
            ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="materialId"
            label="Material"
            placeholder="Select material"
          >
            {materials?.map((material: Materials) => (
              <SelectItem
                key={material.$id}
                value={material.$id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {material.name}
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
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
          )}
          <SubmitButton isLoading={isLoading} className="shad-primary-btn">
            {mode === "create" ? "Create Product" : "Update Product"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
