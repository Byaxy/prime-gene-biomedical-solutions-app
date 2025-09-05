import { TypeFormValidation, TypeFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { ProductType } from "@/types";
import { useTypes } from "@/hooks/useTypes";

interface ProductTypeFormProps {
  mode: "create" | "edit";
  initialData?: ProductType;
  onCancel?: () => void;
}

const ProductTypeForm = ({
  mode,
  initialData,
  onCancel,
}: ProductTypeFormProps) => {
  const { addType, editType, isAddingType, isEditingType } = useTypes();
  const form = useForm<TypeFormValues>({
    resolver: zodResolver(TypeFormValidation),
    defaultValues: initialData || {
      name: "",
      description: "",
    },
  });

  const handleSubmit = async (values: TypeFormValues) => {
    try {
      if (mode === "create") {
        await addType(values, {
          onSuccess: () => {
            onCancel?.();
          },
        });
      }
      if (mode === "edit" && initialData) {
        await editType(
          {
            id: initialData.id,
            data: values,
          },
          {
            onSuccess: () => {
              onCancel?.();
            },
          }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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
          <SubmitButton
            isLoading={isAddingType || isEditingType}
            className="shad-primary-btn"
          >
            {mode === "create" ? "Create Type" : "Update Type"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ProductTypeForm;
