import { z } from "zod";

export const LoginFormValidation = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password is required and must be at least 8 characters"),
});

export const CreateUserFormValidation = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .refine((phone) => /^\+\d{10,15}$/.test(phone), "Invalid phone number"),
    role: z.string().min(1, "Role is required"),
    password: z
      .string()
      .min(8, "Password is required and must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const CategoryFormValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof CategoryFormValidation>;
