/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  accompanyingExpenseTypesTable,
  accountsTable,
  chartOfAccountsTable,
  expenseCategoriesTable,
  incomeCategoriesTable,
  inventoryTransactionsTable,
} from "@/drizzle/schema";

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
  category: Category;
  brand: Brand;
  type: ProductType;
  unit: Unit;
  totalBackorderStockQuantity: number;
  totalInventoryStockQuantity: number;
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

export interface GroupedWaybills {
  id: string;
  customer: Customer;
  sale: Sale;
  totalWaybills: number;
  waybills: WaybillWithRelations[];
  latestWaybillDate: Date;
  latestWaybillRefNumber: string;
}

export interface InventoryTransactionWithRelations {
  transaction: typeof inventoryTransactionsTable.$inferSelect;
  inventory: InventoryStock;
  product: Product;
  store: Store;
  user: User;
}

// Purchases
export interface Purchase {
  id: string;
  purchaseNumber: string;
  vendorInvoiceNumber: string;
  purchaseDate: Date;
  vendorId: string;
  purchaseOrderId?: string;
  totalAmount: number;
  amountPaid: number;
  shippingStatus: ShippingStatus;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  attachments: Attachment[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  quantityReceived: number;
  costPrice: number;
  totalPrice: number;
  productName: string;
  productID: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseWithRelations {
  purchase: Purchase;
  vendor: Vendor;
  products: PurchaseItem[];
}

// Purchase Orders
export interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  vendorId: string;
  totalAmount: number;
  purchaseOrderDate: Date;
  status: PurchaseStatus;
  notes: string;
  isConvertedToPurchase: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
  productName: string;
  productID: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderWithRelations {
  purchaseOrder: PurchaseOrder;
  vendor: Vendor;
  products: PurchaseOrderItem[];
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
  quotationId?: string;
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
  delivery: Delivery;
  promissoryNote: PromissoryNote;
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

export interface PromissoryNote {
  id: string;
  promissoryNoteRefNumber: string;
  promissoryNoteDate: Date;
  customerId: string;
  saleId: string;
  totalAmount: number;
  status: PromissoryNoteStatus;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromissoryNoteItem {
  id: string;
  saleItemId: string;
  productId: string;
  promissoryNoteId: string;
  fulfilledQuantity: number;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  productName: string;
  productID: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromissoryNoteWithRelations {
  promissoryNote: PromissoryNote;
  products: PromissoryNoteItem[];
  customer: Customer;
  sale: Sale;
}

// Received Purchases
export interface ReceivedPurchase {
  id: string;
  purchaseId: string;
  vendorId: string;
  storeId: string;
  vendorParkingListNumber: string;
  receivingDate: Date;
  totalAmount: number;
  notes: string;
  attachments: Attachment[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivedPurchaseItem {
  id: string;
  receivingId: string;
  productId: string;
  purchaseItemId: string;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  inventoryStock: ReceivedPurchaseItemStock[];
  productName: string;
  productID: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivedPurchaseItemStock {
  receivingItemId: string;
  lotNumber: string;
  quantity: number;
  manufactureDate: Date | null;
  expiryDate: Date | null;
}

export interface ReceivedPurchaseWithRelations {
  receivedPurchase: ReceivedPurchase;
  purchase: Purchase;
  vendor: Vendor;
  store: Store;
  products: ReceivedPurchaseItem[];
}

export interface GroupedReceivedPurchases {
  id: string;
  purchase: Purchase;
  vendor: Vendor;
  store: Store;
  totalReceivedPurchases: number;
  totalAmount: number;
  receivedPurchases: ReceivedPurchaseWithRelations[];
  latestReceivingDate: Date;
  latestVendorParkingListNumber: string;
}

// Shipments
export interface Shipment {
  id: string;
  shipmentRefNumber: string;
  numberOfPackages: number;
  totalItems: number;
  shippingMode: ShippingMode;
  shipperType: ShipperType;
  shippingVendorId?: string;
  shipperName?: string;
  shipperAddress?: string;
  carrierType: CarrierType;
  carrierName: string;
  trackingNumber: string;
  shippingDate: Date;
  estimatedArrivalDate: Date | null;
  dateShipped: Date | null;
  actualArrivalDate: Date | null;
  totalAmount: number;
  status: ShipmentStatus;
  originPort: string;
  destinationPort: string;
  containerNumber: string | null;
  flightNumber: string | null;
  notes: string | null;
  attachments: Attachment[];
  purchaseIds: string[];
  vendorIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParcelItem {
  id: string;
  parcelId: string;
  productId: string;
  productName: string;
  productID: string;
  productUnit: string;
  quantity: number;
  isPurchaseItem: boolean;
  purchaseReference?: string;
  netWeight: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Parcel {
  id: string;
  shipmentId: string;
  parcelNumber: string;
  packageType: PackageType;
  length: number;
  width: number;
  height: number;
  netWeight: number;
  grossWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  volumetricDivisor: number;
  unitPricePerKg: number;
  totalAmount: number;
  totalItems: number;
  description?: string;
  items: ParcelItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extending ShipmentWithRelations to include parcels
export interface ShipmentWithRelations {
  shipment: Shipment;
  shippingVendor: Vendor | null;
  vendors: Vendor[];
  parcels: Parcel[];
}

// Chart of Accounts
export type ChartOfAccount = typeof chartOfAccountsTable.$inferSelect;

export interface ChartOfAccountWithRelations {
  account: ChartOfAccount;
  children?: ChartOfAccountWithRelations[];
}

// Accounts
export type Account = typeof accountsTable.$inferSelect;

export interface AccountWithRelations {
  account: Account;
  chartOfAccount: ChartOfAccount;
}

// Expense Categories
export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;

export interface ExpenseCategoryWithRelations {
  expenseCategory: ExpenseCategory;
  chartOfAccount: ChartOfAccount;
}

// Income Categories
export type IncomeCategory = typeof incomeCategoriesTable.$inferSelect;

export interface IncomeCategoryWithRelations {
  incomeCategory: IncomeCategory;
  chartOfAccount: ChartOfAccount;
}

// Accompanying Expenses
export type AccompanyingExpenseType =
  typeof accompanyingExpenseTypesTable.$inferSelect;

export interface AccompanyingExpenseTypeWithRelations {
  type: AccompanyingExpenseType;
  defaultCategory: ExpenseCategory;
}

// Enums

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

export enum PromissoryNoteStatus {
  Pending = "pending",
  Fulfiled = "fulfilled",
  Partial = "partial",
  Cancelled = "cancelled",
}

export enum InventoryTransactionType {
  Purchase = "purchase",
  Sale = "sale",
  Loan = "loan",
  "Sale Reversal" = "sale_reversal",
  "Waybill Edite Reversal" = "waybill_edit_reversal",
  "Waybill Edit" = "waybill_edit",
  Transfer = "transfer",
  Adjustment = "adjustment",
  "Backorder Fulfillment" = "backorder_fulfillment",
  "Waybill Deletion Restore" = "waybill_deletion_restore",
}

export enum ShippingStatus {
  "Not Shipped" = "not_shipped",
  Shipped = "shipped",
  Received = "received",
}

export enum ShippingMode {
  Express = "express",
  Air = "air",
  Sea = "sea",
}

export enum ShipperType {
  Vendor = "vendor",
  Courier = "courier",
}

export enum ShipmentStatus {
  Pending = "pending",
  InTransit = "in_transit",
  Delivered = "delivered",
  Cancelled = "cancelled",
}

export enum PackageType {
  Box = "Box",
  Carton = "Carton",
  Crate = "Crate",
  Pallet = "Pallet",
  Bag = "Bag",
  Drum = "Drum",
  Roll = "Roll",
}

export enum CarrierType {
  ExpressCargo = "ExpressCargo",
  AirCargo = "AirCargo",
  SeaCargo = "SeaCargo",
}

export enum ChartOfAccountType {
  ASSET = "asset",
  LIABILITY = "liability",
  EQUITY = "equity",
  REVENUE = "revenue",
  EXPENSE = "expense",
  OTHER = "other",
}

export enum AccountType {
  BANK = "bank",
  MOBILE_MONEY = "mobile_money",
  CASH_ON_HAND = "cash_on_hand",
  OTHER = "other",
}

export enum JournalEntryReferenceType {
  PURCHASE = "purchase",
  SALE = "sale",
  EXPENSE = "expense",
  PAYMENT_RECEIVED = "payment_received",
  BILL_PAYMENT = "bill_payment",
  ADJUSTMENT = "adjustment",
}
