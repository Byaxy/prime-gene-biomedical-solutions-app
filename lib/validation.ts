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

// Categories
export const CategoryFormValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});
export type CategoryFormValues = z.infer<typeof CategoryFormValidation>;

// Types
export const TypeFormValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});
export type TypeFormValues = z.infer<typeof TypeFormValidation>;

// Materials
export const MaterialFormValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});
export type MaterialFormValues = z.infer<typeof MaterialFormValidation>;

// Colors
export const ColorFormValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().nonempty("Code is required"),
});
export type ColorFormValues = z.infer<typeof ColorFormValidation>;

// Products
export const ProductFormValidation = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or more"),
  quantity: z.number().int().min(0, "Quantity must be 0 or more"),
  categoryId: z.string().nonempty("Category is required"),
  typeId: z.string().nonempty("Type is required"),
  materialId: z.string().nonempty("Material is required"),
  colorId: z.string().nonempty("Color is required"),
});
export type ProductFormValues = z.infer<typeof ProductFormValidation>;

// Expenses
export const ExpenseFormValidation = z.object({
  title: z
    .string()
    .nonempty("Title is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().nonempty("Description is required"),
  amount: z.number().min(0, "Amount must be 0 or more"),
  expenseDate: z.date().refine((date) => date <= new Date(), {
    message: "Expense date cannot be in the future",
  }),
});
export type ExpenseFormValues = z.infer<typeof ExpenseFormValidation>;
