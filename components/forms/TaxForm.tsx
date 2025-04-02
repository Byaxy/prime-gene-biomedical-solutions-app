import { TaxFormValidation, TaxFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Tax } from "@/types";

interface TaxFormProps {
  mode: "create" | "edit";
  initialData?: Tax;
  onSubmit: (data: TaxFormValues) => Promise<void>;
  onCancel?: () => void;
}

const TaxForm = ({ mode, initialData, onSubmit, onCancel }: TaxFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(TaxFormValidation),
    defaultValues: initialData || {
      name: "",
      taxRate: 0,
      code: "",
      description: "",
    },
  });

  const handleSubmit = async (values: TaxFormValues) => {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Tax Name"
            placeholder="Enter tax name"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="code"
            label="Tax Code"
            placeholder="Enter tax code"
          />

          <CustomFormField
            fieldType={FormFieldType.NUMBER}
            control={form.control}
            name="taxRate"
            label="Tax Rate(%)"
            placeholder="Enter tax rate"
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter tax description"
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
            {mode === "create" ? "Create Tax" : "Update Tax"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default TaxForm;
