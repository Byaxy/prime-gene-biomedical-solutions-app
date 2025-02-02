import { CategoryFormValidation, CategoryFormValues } from "@/lib/validation";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";

interface CategoryFormProps {
  mode: "create" | "edit";
  initialData?: CategoryFormValues;
  onSubmit: (data: CategoryFormValues) => Promise<void>;
  onCancel?: () => void;
}
const CategoryForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: CategoryFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormValidation),
    defaultValues: initialData || {
      name: "",
      description: "",
    },
  });

  const handleSubmit = async (values: CategoryFormValues) => {
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
            label="Category Name"
            placeholder="Enter category name"
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter category description"
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
            {mode === "create" ? "Create Category" : "Update Category"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;
