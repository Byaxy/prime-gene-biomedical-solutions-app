"use client";

import { useState } from "react";
import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  CreateUserValidation,
  EditUserValidation,
  UserFormValues,
} from "@/lib/validation";
import { SelectItem } from "../ui/select";
import { RoleOptions } from "@/constants";
import { Button } from "../ui/button";
import { FileUploader } from "../FileUploader";
import { User } from "@/types/appwrite.types";

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: User;
  onSubmit: (data: UserFormValues, prevImageId?: string) => Promise<void>;
  onCancel?: () => void;
}
const UserForm = ({ mode, initialData, onSubmit, onCancel }: UserFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === "create" ? CreateUserValidation : EditUserValidation
    ),
    defaultValues: initialData || {
      phone: "",
      name: "",
      role: "",
      image: [],
      ...(mode === "create" && {
        email: "",
        password: "",
        confirmPassword: "",
      }),
    },
  });

  const handleSubmit = async (values: UserFormValues) => {
    setIsLoading(true);
    try {
      if (mode === "edit" && values?.image && initialData?.profileImageId) {
        await onSubmit(values, initialData?.profileImageId);
      }

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
        className="space-y-5 text-dark-500 overflow-y-auto h-full"
      >
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="image"
            label="Profile Image"
            renderSkeleton={(field) => (
              <FormControl>
                <FileUploader
                  files={field.value}
                  onChange={field.onChange}
                  mode={mode}
                  currentImageUrl={initialData?.profileImageUrl}
                />
              </FormControl>
            )}
          />
          <div className="w-full flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="name"
              label="Full Name"
              placeholder="John Doe"
            />
            {mode === "create" && (
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="email"
                label="Email"
                placeholder="johndoe@gmail.com"
              />
            )}
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="role"
              label="Role"
              placeholder="Select a role"
            >
              {RoleOptions.map((role, i) => (
                <SelectItem
                  key={role + i}
                  value={role}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {role}
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={form.control}
              name="phone"
              label="Phone number"
              placeholder="(555) 123-4567"
            />
          </div>

          {mode === "create" && (
            <div className="w-full flex flex-col sm:flex-row gap-5">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="password"
                label="Password"
                placeholder="********"
              />

              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="confirmPassword"
                label="Confirm Password"
                placeholder="********"
              />
            </div>
          )}
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
            {mode === "create" ? "Create User" : "Update User"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default UserForm;
