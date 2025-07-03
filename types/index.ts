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
  address: {
    addressName: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
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
export interface GroupedInventoryStock {
  id: string;
  product: {
    id: string;
    productID: string;
    name: string;
  };
  store: Store;
  totalQuantity: number;
  avgCostPrice: number;
  avgSellingPrice: number;
  stockBatches: {
    id: string;
    receivedDate: Date;
    lotNumber: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    manufactureDate: Date | null;
    expiryDate: Date | null;
  }[];
  earliestManufactureDate: Date | null;
  nearestExpiryDate: Date | null;
  latestReceivedDate: Date;
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
  isDeliveryNoteCreated: boolean;
  isDeliveryAddressAdded: boolean;
  deliveryAddress: DeliveryAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  storeId: string;
  inventoryStock: SaleInventoryStock[];
  backorders: SaleBackorder[];
  taxRateId: string;
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
  hasBackorder: boolean;
  backorderQuantity: number;
  fulfilledQuantity: number;
}

export interface SaleInventoryStock {
  inventoryStockId: string;
  lotNumber: string;
  quantityToTake: number;
}
export interface SaleBackorder {
  id: string;
  productId: string;
  storeId: string;
  saleItemId: string;
  pendingQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleWithRelations {
  sale: Sale;
  products: SaleItem[];
  customer: Customer;
  store: Store;
}

export interface Delivery {
  id: string;
  deliveryDate: Date;
  deliveryRefNumber: string;
  status: DeliveryStatus;
  deliveredBy: string;
  receivedBy: string;
  customerId: string;
  storeId: string;
  saleId: string;
  notes: string;
  deliveryAddress: DeliveryAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryItem {
  id: string;
  deliveryId: string;
  productId: string;
  quantityRequested: number;
  quantitySupplied: number;
  balanceLeft: number;
  productName: string;
  productID: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryWithRelations {
  delivery: Delivery;
  products: DeliveryItem[];
  customer: Customer;
  store: Store;
  sale: Sale;
}

// Waybill
export interface Waybill {
  id: string;
  waybillRefNumber: string;
  waybillDate: Date;
  status: DeliveryStatus;
  deliveredBy: string;
  receivedBy: string;
  customerId: string;
  storeId: string;
  saleId: string;
  waybillType: WaybillType;
  isConverted: boolean;
  conversionDate: Date | null;
  conversionStatus: WaybillConversionStatus;
  notes: string;
  deliveryAddress: DeliveryAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaybillItem {
  id: string;
  deliveryId: string;
  productId: string;
  saleItemId: string;
  inventoryStock: WaybillInventoryStock[];
  quantityRequested: number;
  quantitySupplied: number;
  balanceLeft: number;
  fulfilledQuantity: number;
  quantityConverted: number;
  productName: string;
  productID: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaybillInventoryStock {
  inventoryStockId: string;
  lotNumber: string;
  quantityTaken: number;
  unitPrice: number;
}
export interface WaybillWithRelations {
  waybill: Waybill;
  products: WaybillItem[];
  customer: Customer;
  store: Store;
  sale: Sale;
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

export enum WaybillType {
  Loan = "loan",
  Sale = "sale",
  Conversion = "conversion",
}

export enum WaybillConversionStatus {
  Pending = "pending",
  Partial = "partial",
  Full = "full",
}
