/* eslint-disable @typescript-eslint/no-explicit-any */
import { inventoryTransactionsTable } from "@/drizzle/schema";

export type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export type Gender = "Male" | "Female" | "Other";
export type Status = "pending" | "scheduled" | "cancelled";

export interface CreateUserParams {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImageId: string;
  profileImageUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface Tax {
  id: string;
  name: string;
  taxRate: number;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductType {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  imageId: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  path: string;
  depth: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Customers
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Products
export interface Product {
  id: string;
  productID: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  description: string;
  quantity: number;
  alertQuantity: number;
  maxAlertQuantity: number;
  categoryId: string;
  typeId: string;
  brandId: string;
  unitId: string;
  imageId: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// Product with relations
export interface ProductWithRelations {
  product: Product;
  category: { id: string; name: string };
  brand: { id: string; name: string };
  type: { id: string; name: string };
  unit: { id: string; name: string; code: string };
}

export interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Company Settings
export interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  logoId: string;
  logoUrl: string;
  currency: string;
  currencySymbol: string;
  createdAt: Date;
  updatedAt: Date;
}

// Stores
export interface Store {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory Stock
export interface InventoryStock {
  id: string;
  storeId: string;
  productId: string;
  receivedDate: Date;
  lotNumber: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  manufactureDate: Date | null;
  expiryDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryStockWithRelations {
  inventory: InventoryStock;
  product: Product;
  store: Store;
}

export interface InventoryTransactionWithRelations {
  transaction: typeof inventoryTransactionsTable.$inferSelect;
  inventory: InventoryStock;
  product: Product;
  store: Store;
  user: User;
}

// Quotations
export interface Quotation {
  id: string;
  quotationNumber: string;
  rfqNumber: string;
  quotationDate: Date;
  customerId: string;
  discountAmount: number;
  subTotal: number;
  totalAmount: number;
  totalTaxAmount: number;
  convertedToSale: boolean;
  status: QuotationStatus;
  notes: string;
  attachments: Attachment[];
  isDeliveryAddressAdded: boolean;
  deliveryAddress: DeliveryAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface DeliveryAddress {
  addressName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  email: string;
  phone: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  subTotal: number;
  taxAmount: number;
  taxRate: number;
  taxRateId: string;
  discountRate: number;
  discountAmount: number;
  productName: string;
  productID: string;
}
export interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}
export interface QuotationWithRelations {
  quotation: Quotation;
  customer: Customer;
  products: QuotationItem[];
}

// Sales
export interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: Date;
  customerId: string;
  storeId: string;
  subTotal: number;
  totalAmount: number;
  totalTaxAmount: number;
  discountAmount: number;
  amountPaid: number;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  quotationId: string;
  attachments: Attachment[];
  isDeliveryAddressAdded: boolean;
  deliveryAddress: DeliveryAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface SaleItem {
  id: string;
  inventoryStockId: string;
  saleId: string;
  productId: string;
  storeId: string;
  taxRateId: string;
  lotNumber: string;
  availableQuantity: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  subTotal: number;
  taxAmount: number;
  taxRate: number;
  discountRate: number;
  discountAmount: number;
  productName: string;
  productID: string;
}
export interface SaleWithRelations {
  sale: Sale;
  products: SaleItem[];
  customer: Customer;
  store: Store;
}

// payment methods
export enum PaymentMethod {
  Cash = "cash",
  Check = "check",
  "Mobile Money" = "mobile-money",
  Bank = "bank",
}

// delivery status
export enum DeliveryStatus {
  Pending = "pending",
  "In Progress" = "in-progress",
  Delivered = "delivered",
  Cancelled = "cancelled",
}

// quotation status
export enum QuotationStatus {
  Pending = "pending",
  Completed = "completed",
  Cancelled = "cancelled",
}

// sale status
export enum SaleStatus {
  Pending = "pending",
  Completed = "completed",
  Cancelled = "cancelled",
}

// purchase status
export enum PurchaseStatus {
  Pending = "pending",
  Completed = "completed",
  Cancelled = "cancelled",
}

// Payment Status
export enum PaymentStatus {
  Pending = "pending",
  Partial = "partial",
  Paid = "paid",
  Due = "due",
}
