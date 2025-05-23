"use client";

import { CustomerFormValidation, CustomerFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Customer } from "@/types";

interface CustomerFormProps {
  mode: "create" | "edit";
  initialData?: Customer;
  onSubmit: (data: CustomerFormValues) => Promise<void>;
  onCancel?: () => void;
}

const CustomerForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: CustomerFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormValidation),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const handleSubmit = async (values: CustomerFormValues) => {
    setIsLoading(true);
    try {
      await onSubmit(values);
      onCancel?.();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Name"
          placeholder="Enter customer name"
        />
        <div className="flex flex-col sm:flex-row gap-5">
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
        </div>
        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="address"
          label="Address"
          placeholder="Enter customer address"
        />

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            onClick={() => {
              form.reset();
              onCancel?.();
            }}
            className="shad-danger-btn"
          >
            Cancel
          </Button>
          <SubmitButton isLoading={isLoading} className="shad-primary-btn">
            {mode === "create" ? "Create Customer" : "Update Customer"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default CustomerForm;
