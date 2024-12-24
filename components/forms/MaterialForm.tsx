import { MaterialFormValidation, MaterialFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";

interface MaterialFormProps {
  mode: "create" | "edit";
  initialData?: MaterialFormValues;
  onSubmit: (data: MaterialFormValues) => Promise<void>;
  onCancel?: () => void;
}
const MaterialForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: MaterialFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(MaterialFormValidation),
    defaultValues: initialData || {
      name: "",
    },
  });

  const handleSubmit = async (values: MaterialFormValues) => {
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
          label="Name"
          placeholder="Enter material name"
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
            {mode === "create" ? "Create Material" : "Update Material"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default MaterialForm;
