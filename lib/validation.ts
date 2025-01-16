import { z } from "zod";

export const LoginFormValidation = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password is required and must be at least 8 characters"),
});

// Users
export const CreateUserValidation = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.string().min(1, "Role is required"),
    image: z.any().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const EditUserValidation = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  phone: z.string().min(1, "Phone number is required"),
  image: z.any().optional(),
});

export type CreateUserFormValues = z.infer<typeof CreateUserValidation>;
export type EditUserFormValues = z.infer<typeof EditUserValidation>;
export type UserFormValues = CreateUserFormValues | EditUserFormValues;

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
  costPrice: z.number().min(0, "Price must be 0 or more"),
  sellingPrice: z.number().min(0, "Price must be 0 or more"),
  quantity: z.number().int().min(0, "Quantity must be 0 or more"),
  categoryId: z.string().nonempty("Category is required"),
  typeId: z.string().nonempty("Type is required"),
  materialId: z.string().nonempty("Material is required"),
  colorId: z.string().nonempty("Color is required"),
  unitId: z.string().nonempty("Unit is required"),
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

// Purchases
export const PurchaseFormValidation = z.object({
  purchaseOrderNumber: z.string().nonempty("Purchase order number is required"),
  purchaseDate: z.date().refine((date) => date <= new Date(), {
    message: "Purchase date cannot be in the future",
  }),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  amountPaid: z.number().min(0, "Amount paid must be 0 or more"),
  supplierId: z.string().nonempty("Supplier is required"),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        productId: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(0, "Quantity must be 0 or more"),
        unitPrice: z.number().min(0, "Unit price must be 0 or more"),
        totalPrice: z.number().min(0, "Total price must be 0 or more"),
        productName: z.string().optional(),
        productMaterial: z.string().optional(),
        productColor: z.string().optional(),
        productColorCode: z.string().optional(),
      })
    )
    .min(1, "At least one product is required"),

  // Temporary fields for product selection
  selectedProduct: z.string().optional(),
  tempQuantity: z.number().optional(),
  tempPrice: z.number().optional(),
});
export type PurchaseFormValues = z.infer<typeof PurchaseFormValidation>;

// Suppliers
export const SupplierFormValidation = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .nonempty("Name is required"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
});
export type SupplierFormValues = z.infer<typeof SupplierFormValidation>;

// Units
export const UnitFormValidation = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .nonempty("Name is required"),
  code: z.string().nonempty("Code is required"),
  description: z.string().optional(),
});
export type UnitFormValues = z.infer<typeof UnitFormValidation>;
