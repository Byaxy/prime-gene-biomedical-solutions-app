/* eslint-disable @typescript-eslint/no-explicit-any */

// Categories
export interface Category {
  $id: string;
  name: string;
  description: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Brands
export interface Brand {
  $id: string;
  name: string;
  description: string;
  imageId: string;
  imageUrl: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Product Types
export interface ProductType {
  $id: string;
  name: string;
  description: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Units
export interface Unit {
  $id: string;
  name: string;
  code: string;
  description: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Products
export interface Product {
  $id: string;
  name: string;
  lotNumber: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  category: any;
  vendor: any;
  type: any;
  unit: any;
  imageId: string;
  imageUrl: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Expenses
export interface Expense {
  $id: string;
  title: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: Date;
  $createdAt: Date;
  $updatedAt: Date;
}

// Users
export interface User {
  $id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImageId: string;
  profileImageUrl: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Purchases
export interface Purchase {
  $id: string;
  purchaseOrderNumber: string;
  totalAmount: number;
  amountPaid: number;
  purchaseDate: Date;
  vendor: any;
  products: any[];
  status: PurchaseStatus;
  paymentMethod: PaymentMethod;
  deliveryStatus: DeliveryStatus;
  notes?: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Sales
export interface Sale {
  $id: string;
  invoiceNumber: string;
  saleDate: Date;
  customer: any;
  totalAmount: number;
  amountPaid: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  notes: string;
  products: any[];
  $createdAt: Date;
  $updatedAt: Date;
}

// Vendors
export interface Vendor {
  $id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Customers
export interface Customer {
  $id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  $createdAt: Date;
  $updatedAt: Date;
}

// Company Settings
export interface CompanySettings {
  $id: string;
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
  $createdAt: Date;
  $updatedAt: Date;
}

// Quotations
export interface Quotation {
  $id: string;
  quotationNumber: string;
  quotationDate: Date;
  customer: any;
  totalAmount: number;
  amountPaid: number;
  status: QuotationStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  products: any[];
  $createdAt: Date;
  $updatedAt: Date;
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
