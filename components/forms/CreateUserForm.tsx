"use client";

import { useState } from "react";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateUserFormValidation } from "@/lib/validation";
import { SelectItem } from "../ui/select";
import { RoleOptions } from "@/constants";
import { createUser } from "@/lib/actions/user.actions";

const CreateUserForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof CreateUserFormValidation>>({
    resolver: zodResolver(CreateUserFormValidation),
    defaultValues: {
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      name: "",
      role: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof CreateUserFormValidation>) => {
    setIsLoading(true);

    try {
      const user = {
        email: values.email,
        phone: values.phone,
        password: values.password,
        name: values.name,
        role: values.role,
      };

      const newUser = await createUser(user);

      if (newUser) {
        router.push(`/dashboard`);
      }
    } catch (error) {
      console.log(error);
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="my-8">
          <p className="text-dark-700">Add user details.</p>
        </section>

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Full Name"
          placeholder="John Doe"
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
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="role"
          label="Role"
          placeholder="Select a role"
        >
          {RoleOptions.map((role, i) => (
            <SelectItem key={role + i} value={role}>
              <div className="flex cursor-pointer items-center gap-2 capitalize">
                <span>{role}</span>
              </div>
            </SelectItem>
          ))}
        </CustomFormField>

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

        <SubmitButton isLoading={isLoading}>Create User</SubmitButton>
      </form>
    </Form>
  );
};

export default CreateUserForm;
