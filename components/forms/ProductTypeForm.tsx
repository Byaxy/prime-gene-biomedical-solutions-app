import { TypeFormValidation, TypeFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { ProductType } from "@/types";

interface ProductTypeFormProps {
  mode: "create" | "edit";
  initialData?: ProductType;
  onSubmit: (data: TypeFormValues) => Promise<void>;
  onCancel?: () => void;
}

const ProductTypeForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: ProductTypeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TypeFormValues>({
    resolver: zodResolver(TypeFormValidation),
    defaultValues: initialData || {
      name: "",
      description: "",
    },
  });

  const handleSubmit = async (values: TypeFormValues) => {
    setIsLoading(true);
    try {
      await onSubmit(values);
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
        className="text-dark-500"
      >
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Product Type Name"
            placeholder="Enter Product Type name"
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter product type description"
          />
        </div>

        <div className="flex justify-end gap-4 mt-4">
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
            {mode === "create" ? "Create Type" : "Update Type"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ProductTypeForm;
