import { SupplierFormValidation, SupplierFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";

interface SupplierFormProps {
  mode: "create" | "edit";
  initialData?: SupplierFormValues;
  onSubmit: (data: SupplierFormValues) => Promise<void>;
  onCancel?: () => void;
}

const SupplierForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: SupplierFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierFormValidation),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
    },
  });

  const handleSubmit = async (values: SupplierFormValues) => {
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
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Name"
            placeholder="Enter supplier name"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email"
            placeholder="johndoe@gmail.com"
          />

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone number"
            placeholder="(555) 123-4567"
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="address"
            label="Address"
            placeholder="Enter supplier address"
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
            {mode === "create" ? "Create Supplier" : "Update Supplier"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default SupplierForm;
