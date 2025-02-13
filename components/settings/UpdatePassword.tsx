"use client";

import {
  UpdatePasswordFormValidation,
  UpdatePasswordFormValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";

const UpdatePassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword, isUpdatingPassword } = useUsers();
  const { user } = useAuth();

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(UpdatePasswordFormValidation),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: UpdatePasswordFormValues) => {
    setIsLoading(true);
    try {
      if (!user) return;
      await updatePassword({ userId: user.$id, data: values });

      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 mb-6">
          <CustomFormField
            fieldType={FormFieldType.PASSWORD}
            control={form.control}
            name="newPassword"
            label="New Password"
            placeholder="New Password"
          />
          <CustomFormField
            fieldType={FormFieldType.PASSWORD}
            control={form.control}
            name="confirmPassword"
            label="Confirm Password"
            placeholder="Confirm Password"
          />
        </div>

        <div className="flex w-full">
          <SubmitButton isLoading={isLoading || isUpdatingPassword}>
            {isLoading ? "Updating..." : "Update Password"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default UpdatePassword;
