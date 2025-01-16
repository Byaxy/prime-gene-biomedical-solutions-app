import { UnitFormValidation, UnitFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";

interface UnitFormProps {
  mode: "create" | "edit";
  initialData?: UnitFormValues;
  onSubmit: (data: UnitFormValues) => Promise<void>;
  onCancel?: () => void;
}

const UnitsForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: UnitFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(UnitFormValidation),
    defaultValues: initialData || {
      name: "",
      code: "",
      description: "",
    },
  });

  const handleSubmit = async (values: UnitFormValues) => {
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
        className="space-y-6 text-dark-500"
      >
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Product Unit Name"
          placeholder="Enter product unit name"
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="code"
          label="Product Unit Code"
          placeholder="Enter product unit code"
        />

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="description"
          label="Description"
          placeholder="Enter product unit description"
        />

        <div className="flex justify-end gap-4">
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
            {mode === "create" ? "Create Unit" : "Update Unit"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default UnitsForm;
