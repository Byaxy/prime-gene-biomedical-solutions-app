import { ColorFormValidation, ColorFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";

interface ColorFormProps {
  mode: "create" | "edit";
  initialData?: ColorFormValues;
  onSubmit: (data: ColorFormValues) => Promise<void>;
  onCancel?: () => void;
}

const ColorForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: ColorFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ColorFormValues>({
    resolver: zodResolver(ColorFormValidation),
    defaultValues: initialData || {
      name: "",
      code: "",
    },
  });

  const handleSubmit = async (values: ColorFormValues) => {
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
            label="Name"
            placeholder="Enter color name"
          />

          <CustomFormField
            control={form.control}
            name="code"
            label="Choose Color"
            fieldType={FormFieldType.COLOR_PICKER}
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
            {mode === "create" ? "Create Color" : "Update Color"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ColorForm;
