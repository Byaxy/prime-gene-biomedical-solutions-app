"use client";

import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { EditUserValidation, UserFormValues } from "@/lib/validation";
import { SelectItem } from "../ui/select";
import { FileUploader } from "../FileUploader";
import { useState } from "react";
import { RoleWithPermissions, User } from "@/types";
import { useRoles } from "@/hooks/useRoles";
import Loading from "@/app/(dashboard)/loading";

interface UserProfileFormProps {
  initialData: User;
  onSubmit: (data: UserFormValues) => Promise<void>;
  isAdmin?: boolean;
  isEditing: boolean;
}

const UserProfileForm = ({
  initialData,
  onSubmit,
  isAdmin,
  isEditing,
}: UserProfileFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { roles } = useRoles({ getAllRoles: true });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(EditUserValidation),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
      phone: initialData.phone,
      roleId: initialData.roleId,
      image: [],
    },
  });

  const handleSubmit = async (values: UserFormValues) => {
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
                mode="edit"
                currentImageUrl={initialData.profileImageUrl}
              />
            </FormControl>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Full Name"
          />

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone number"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email"
            disabled
          />

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="roleId"
            label="Role"
            disabled={!isAdmin}
            key={`role-select-${form.watch("roleId") || ""}`}
          >
            {roles.length === 0 && <Loading size={20} />}
            {roles.map((role: RoleWithPermissions) => (
              <SelectItem
                key={role.role.id}
                value={role.role.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
              >
                {role.role.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        <div className="flex w-full pt-6">
          <SubmitButton isLoading={isEditing || isLoading}>
            {isEditing ? "Updating..." : "Update Profile"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default UserProfileForm;
