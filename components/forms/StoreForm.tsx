import { StoreFormValidation, StoreFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Store } from "@/types";

interface StoreFormProps {
  mode: "create" | "edit";
  initialData?: Store;
  onSubmit: (data: StoreFormValues) => Promise<void>;
  onCancel?: () => void;
}

const StoreForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: StoreFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(StoreFormValidation),
    defaultValues: initialData || {
      name: "",
      location: "",
    },
  });

  const handleSubmit = async (values: StoreFormValues) => {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Store Name"
            placeholder="Enter store name"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="location"
            label="Store Location"
            placeholder="Enter store location"
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
            {mode === "create" ? "Create Store" : "Update Store"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default StoreForm;
