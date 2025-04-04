import {
  DeliveryStatus,
  PaymentMethod,
  PaymentStatus,
  PurchaseStatus,
  QuotationStatus,
  SaleStatus,
} from "@/types/appwrite.types";
import { z } from "zod";

export const LoginFormValidation = z.object({
  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),
  password: z.string().nonempty("Password is required"),
});

// Users
export const CreateUserValidation = z
  .object({
    name: z.string().nonempty("Name is required"),
    email: z
      .string()
      .nonempty("Email is required")
      .email("Invalid email address"),
    phone: z.string().nonempty("Phone number is required"),
    password: z
      .string()
      .nonempty("Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.string().nonempty("Role is required"),
    image: z.any().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const EditUserValidation = z.object({
  name: z.string().nonempty("Name is required"),
  role: z.string().nonempty("Role is required"),
  phone: z.string().nonempty("Phone number is required"),
  image: z.any().optional(),
});

export type CreateUserFormValues = z.infer<typeof CreateUserValidation>;
export type EditUserFormValues = z.infer<typeof EditUserValidation>;
export type UserFormValues = CreateUserFormValues | EditUserFormValues;

// Categories
export const CategoryFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  parentId: z.string().optional(),
});
export type CategoryFormValues = z.infer<typeof CategoryFormValidation>;

// Types
export const TypeFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
});
export type TypeFormValues = z.infer<typeof TypeFormValidation>;

// Brands
export const BrandFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  image: z.any().optional(),
});
export type BrandFormValues = z.infer<typeof BrandFormValidation>;

// Products
export const ProductFormValidation = z.object({
  productID: z
    .string()
    .nonempty("Product ID is required")
    .min(2, "Product ID must be at least 2 characters"),
  name: z
    .string()
    .nonempty("Name is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  taxRateId: z.string().nonempty("Tax rate is required"),
  quantity: z.number().int().min(0, "Quantity must be 0 or more"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  sellingPrice: z.number().min(0, "Selling price must be positive"),
  alertQuantity: z.number().int().min(1, "Alert quantity must be 1 or more"),
  categoryId: z.string().nonempty("Category is required"),
  typeId: z.string().nonempty("Type is required"),
  brandId: z.string().nonempty("Brand is required"),
  unitId: z.string().nonempty("Unit is required"),
  image: z.any().optional(),
});
export type ProductFormValues = z.infer<typeof ProductFormValidation>;

// Expenses
export const ExpenseFormValidation = z.object({
  title: z
    .string()
    .nonempty("Title is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().nonempty("Description is required"),
  amount: z.number().int().min(0, "Amount must be 0 or more"),
  paymentMethod: z
    .enum(Object.values(PaymentMethod) as [string, ...string[]])
    .default(PaymentMethod.Cash),
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
  vendor: z.string().nonempty("Vendor is required"),
  status: z
    .enum(Object.values(PurchaseStatus) as [string, ...string[]])
    .default(PurchaseStatus.Pending),
  paymentMethod: z
    .enum(Object.values(PaymentMethod) as [string, ...string[]])
    .default(PaymentMethod.Cash),
  deliveryStatus: z
    .enum(Object.values(DeliveryStatus) as [string, ...string[]])
    .default(DeliveryStatus.Pending),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        product: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(0, "Quantity must be 0 or more"),
        unitPrice: z.number().min(0, "Unit price must be 0 or more"),
        totalPrice: z.number().min(0, "Total price must be 0 or more"),
        productName: z.string().optional(),
        productLotNumber: z.string().optional(),
        productUnit: z.string().optional(),
      })
    )
    .min(1, "At least one product is required"),

  // Temporary fields for product selection
  selectedProduct: z.string().optional(),
  tempQuantity: z.number().optional(),
  tempPrice: z.number().optional(),
});
export type PurchaseFormValues = z.infer<typeof PurchaseFormValidation>;

// Vendors
export const VendorFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  email: z.string().optional(),
  phone: z.string().nonempty("Phone number is required"),
  address: z.string().optional(),
});
export type VendorFormValues = z.infer<typeof VendorFormValidation>;

// Customers
export const CustomerFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  email: z.string().optional(),
  phone: z.string().nonempty("Phone number is required"),
  address: z.string().optional(),
});
export type CustomerFormValues = z.infer<typeof CustomerFormValidation>;

// Units
export const UnitFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  code: z.string().nonempty("Code is required"),
  description: z.string().optional(),
});
export type UnitFormValues = z.infer<typeof UnitFormValidation>;

// Tax
export const TaxFormValidation = z.object({
  taxRate: z.number().min(0, "Unit price must be 0 or more"),
  name: z.string().nonempty("Name is required"),
  code: z.string().nonempty("Code is required"),
  description: z.string().optional(),
});
export type TaxFormValues = z.infer<typeof TaxFormValidation>;

// Sales
export const SaleFormValidation = z.object({
  invoiceNumber: z.string().nonempty("Invoice number is required"),
  saleDate: z.date().refine((date) => date <= new Date(), {
    message: "Sale date cannot be in the future",
  }),
  customer: z.string().nonempty("Customer is required"),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  amountPaid: z.number().min(0, "Amount paid must be 0 or more"),
  status: z
    .enum(Object.values(SaleStatus) as [string, ...string[]])
    .default(SaleStatus.Pending),
  paymentMethod: z
    .enum(Object.values(PaymentMethod) as [string, ...string[]])
    .default(PaymentMethod.Cash),
  paymentStatus: z
    .enum(Object.values(PaymentStatus) as [string, ...string[]])
    .default(PaymentStatus.Pending),
  deliveryStatus: z
    .enum(Object.values(DeliveryStatus) as [string, ...string[]])
    .default(DeliveryStatus.Pending),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        product: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(0, "Quantity must be 0 or more"),
        unitPrice: z.number().min(0, "Unit price must be 0 or more"),
        totalPrice: z.number().min(0, "Total price must be 0 or more"),
        productName: z.string().optional(),
        productLotNumber: z.string().optional(),
        productUnit: z.string().optional(),
      })
    )
    .min(1, "At least one product is required"),

  // Temporary fields for product selection
  selectedProduct: z.string().optional(),
  tempQuantity: z.number().optional(),
  tempPrice: z.number().optional(),
});
export type SaleFormValues = z.infer<typeof SaleFormValidation>;

// Update Password
export const UpdatePasswordFormValidation = z
  .object({
    newPassword: z
      .string()
      .nonempty("New password is required")
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .nonempty("Confirm password is required")
      .min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type UpdatePasswordFormValues = z.infer<
  typeof UpdatePasswordFormValidation
>;

// Company Settings
export const CompanySettingsFormValidation = z.object({
  name: z.string().nonempty("Company name is required"),
  email: z
    .string()
    .email("Invalid email address")
    .nonempty("Email is required"),
  phone: z.string().nonempty("Phone number is required"),
  address: z.string().nonempty("Address is required"),
  city: z.string().nonempty("City is required"),
  state: z.string().nonempty("State is required"),
  country: z.string().nonempty("Country is required"),
  image: z.any().optional(),
  currency: z.string().nonempty("Currency is required"),
  currencySymbol: z.string().nonempty("Currency Symbol is required"),
});
export type CompanySettingsFormValues = z.infer<
  typeof CompanySettingsFormValidation
>;

// Quotations
export const QuotationFormValidation = z.object({
  quotationNumber: z.string().nonempty("Quotation number is required"),
  quotationDate: z.date().refine((date) => date <= new Date(), {
    message: "Quotation date cannot be in the future",
  }),
  customer: z.string().nonempty("Customer is required"),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  amountPaid: z.number().min(0, "Amount paid must be 0 or more"),
  status: z
    .enum(Object.values(QuotationStatus) as [string, ...string[]])
    .default(QuotationStatus.Pending),
  paymentMethod: z
    .enum(Object.values(PaymentMethod) as [string, ...string[]])
    .default(PaymentMethod.Cash),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        product: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(0, "Quantity must be 0 or more"),
        unitPrice: z.number().min(0, "Unit price must be 0 or more"),
        totalPrice: z.number().min(0, "Total price must be 0 or more"),
        productName: z.string().optional(),
        productLotNumber: z.string().optional(),
        productUnit: z.string().optional(),
      })
    )
    .min(1, "At least one product is required"),

  // Temporary fields for product selection
  selectedProduct: z.string().optional(),
  tempQuantity: z.number().optional(),
  tempPrice: z.number().optional(),
});
export type QuotationFormValues = z.infer<typeof QuotationFormValidation>;

// Stores
export const StoreFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  location: z.string().nonempty("Location is required"),
});
export type StoreFormValues = z.infer<typeof StoreFormValidation>;

// Stock Adjustments
export const StockAdjustmentFormValidation = z.object({
  storeId: z.string().nonempty("Store is required"),
  receivedDate: z.date().refine((date) => date <= new Date(), {
    message: "Received date cannot be in the future",
  }),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        productId: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        lotNumber: z.string().nonempty("Lot number is required"),
        costPrice: z.number().min(0, "Cost price must be positive"),
        sellingPrice: z.number().min(0, "Selling price must be positive"),
        manufactureDate: z.date().optional(),
        expiryDate: z.date().optional(),
      })
    )
    .min(1, "At least one product is required"),

  // Temporary fields for product selection
  selectedProduct: z.string().optional(),
  tempLotNumber: z.string().optional(),
  tempQuantity: z.number().optional(),
  tempCostPrice: z.number().optional(),
  tempSellingPrice: z.number().optional(),
  tempManufactureDate: z.date().optional(),
  tempExpiryDate: z.date().optional(),
});
export type StockAdjustmentFormValues = z.infer<
  typeof StockAdjustmentFormValidation
>;

// Product Bulck Upload
export const BulkProductValidation = z.array(
  ProductFormValidation.omit({ image: true }).extend({
    id: z.string().optional(),
  })
);
export type BulkProductValues = z.infer<typeof BulkProductValidation>;
