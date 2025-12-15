/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  accompanyingExpenseTypesTable,
  accountsTable,
  billPaymentAccompanyingExpensesTable,
  billPaymentAccountsTable,
  billPaymentItemsTable,
  billPaymentsTable,
  chartOfAccountsTable,
  commissionPayoutsTable,
  commissionRecipientsTable,
  commissionSalesTable,
  commissionsTable,
  customersTable,
  expenseCategoriesTable,
  expenseItemsTable,
  expensesTable,
  incomeCategoriesTable,
  inventoryTransactionsTable,
  paymentsReceivedTable,
  purchasesTable,
  receiptItemsTable,
  receiptsTable,
  salesAgentsTable,
  salesTable,
  usersTable,
  vendorsTable,
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
export type Customer = typeof customersTable.$inferSelect;

// Products
export interface Product {
  id: string;
  productID: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  description: string;
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
  product: Omit<Product, "quantity"> & { derivedQuantity: number };
  category: Category;
  brand: Brand;
  type: ProductType;
  unit: Unit;
  totalBackorderStockQuantity: number;
  totalInventoryStockQuantity: number;
  totalQuantityOnHand: number;
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
export type Sale = typeof salesTable.$inferSelect;
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
  originalPendingQuantity: number;
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

export interface WaybillProductForPromissoryNote {
  productId: string;
  productID: string;
  quantitySupplied: number;
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

// Expenses
export type Expense = typeof expensesTable.$inferSelect;

export type ExpenseItem = typeof expenseItemsTable.$inferSelect;

export interface ExpenseWithRelations {
  expense: Expense;
  items: ExpenseItemWithRelations[];
}

export interface ExpenseItemWithRelations {
  expenseItem: ExpenseItem;
  category: ExpenseCategory;
  payingAccount: Account;
  purchase: Purchase;
  accompanyingExpenseType: AccompanyingExpenseType;
}

// Income/Payments
export type PaymentReceived = typeof paymentsReceivedTable.$inferSelect;

export interface IncomeWithRelations {
  payment: PaymentReceived;
  customer: Customer | null;
  sale: Sale | null;
  incomeCategory: IncomeCategory | null;
  receivingAccount: Account | null;
}

// Billing
export type BillPayment = typeof billPaymentsTable.$inferSelect;
export type BillPaymentItem = typeof billPaymentItemsTable.$inferSelect;
export type BillPaymentAccountAllocation =
  typeof billPaymentAccountsTable.$inferSelect;
export type BillPaymentAccompanyingExpense =
  typeof billPaymentAccompanyingExpensesTable.$inferSelect;

// NEW: Type for a Bill Payment Item with its relations (e.g., the Purchase it's paying for)
export interface BillPaymentItemWithRelations {
  item: BillPaymentItem;
  purchase: typeof purchasesTable.$inferSelect | null;
}

// NEW: Type for a Bill Payment Account Allocation with its relations (e.g., the Account used)
export interface BillPaymentAccountAllocationWithRelations {
  allocation: BillPaymentAccountAllocation;
  account: typeof accountsTable.$inferSelect | null;
}

// NEW: Type for a Bill Payment Accompanying Expense with its relations (e.g., the type of expense)
export interface BillPaymentAccompanyingExpenseWithRelations {
  expense: BillPaymentAccompanyingExpense;
  accompanyingType: typeof accompanyingExpenseTypesTable.$inferSelect | null;
}

// NEW: Type for the main Bill Payment with all its nested relations
export interface BillPaymentWithRelations {
  billPayment: BillPayment;
  vendor: typeof vendorsTable.$inferSelect | null;
  user: typeof usersTable.$inferSelect | null;
  items: BillPaymentItemWithRelations[];
  payingAccounts: BillPaymentAccountAllocationWithRelations[];
  accompanyingExpenses: BillPaymentAccompanyingExpenseWithRelations[];
}

export interface BillTrackerData {
  purchase: typeof purchasesTable.$inferSelect;
  vendor: typeof vendorsTable.$inferSelect | null;
  totalPaidOnPurchase: number;
  lastPaymentRef: string | null;
  openBalance: number;
  paymentStatus: PaymentStatus;
  billPaymentId: string | null;
}

// Income tracker
export type IncomeTrackerRecord = {
  sale: Sale & { amountPaid: string }; // amountPaid is overridden with aggregated value
  customer: Customer | null;
  totalReceivedOnSale: number;
  latestPaymentInfo: { id: string | null; ref: string | null } | null;
  paymentId: string | null;
  openBalance: string;
  paymentStatus: PaymentStatus;
  lastPaymentRef: string | null;
  isOverdue: boolean;
};

// Type for the summary stats within getIncomeTrackerData and getIncomeTrackerSummary
export type IncomeTrackerSummary = {
  unbilled: {
    amount: string;
    count: number;
  };
  unpaid: {
    amount: string;
    count: number;
  };
  overdue: {
    amount: string;
    count: number;
  };
  paidLast30Days: {
    amount: string;
    count: number;
  };
};

export type GetIncomeTrackerDataResponse = {
  documents: IncomeTrackerRecord[];
  total: number;
  summary: IncomeTrackerSummary;
};

// Receipts
export type Receipt = typeof receiptsTable.$inferSelect;

export type ReceiptItem = typeof receiptItemsTable.$inferSelect;

export interface ReceiptItemWithRelations {
  receiptItem: ReceiptItem;
  paymentReceived: PaymentReceived | null;
  sale: Sale | null;
  incomeCategory: IncomeCategory | null;
  receivingAccount: Account | null;
}

export interface ReceiptWithRelations {
  receipt: Receipt;
  customer: Customer | null;
  items: ReceiptItemWithRelations[];
}

// --- Sales Agent ---
export type SalesAgent = typeof salesAgentsTable.$inferSelect;

export interface SalesAgentWithRelations {
  salesAgent: SalesAgent;
  user: User | null;
}

// --- Commission Record ---
export type Commission = typeof commissionsTable.$inferSelect;

export interface CommissionWithRelations {
  commission: Commission;
  customer: Customer;
  recipients: CommissionRecipientWithRelations[];
  commissionSales: CommissionSaleWithRelations[];
}

// --- Commission Recipient ---
export type CommissionRecipient = typeof commissionRecipientsTable.$inferSelect;

export interface CommissionRecipientWithRelations {
  recipient: CommissionRecipient;
  salesAgent: SalesAgent;
  payouts: CommissionPayoutWithRelations[];
  paidSoFar: number;
  remainingDue: number;
}

export type CommissionSale = typeof commissionSalesTable.$inferSelect;

export interface CommissionSaleWithRelations {
  commissionSale: CommissionSale;
  sale: Sale;
  withholdingTax: Tax | null;
}

export type CommissionPayout = typeof commissionPayoutsTable.$inferSelect;

export interface CommissionPayoutWithRelations {
  payout: CommissionPayout;
  payingAccount: Account | null;
  expenseCategory: ExpenseCategory | null;
}

export type GetCommissionPayoutWithRelations = {
  payout: CommissionPayout;
  commissionRecipient: {
    recipient: CommissionRecipient;
    salesAgent: SalesAgent;
    commission: Commission;
  };
  payingAccount: Account;
  expenseCategory: ExpenseCategory;
  relatedInvoiceNumbers: string;
};
// Enums

// payment methods
export enum PaymentMethod {
  Cash = "cash",
  Check = "check",
  Mobile_Money = "mobile-money",
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
  COMMISSION_PAYMENT = "commission_payment",
}

export enum DateRange {
  ALL = "all",
  TODAY = "today",
  YESTERDAY = "yesterday",
  THIS_WEEK = "this_week",
  LAST_WEEK = "last_week",
  LAST_TWO_WEEKS = "last_two_weeks",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_QUARTER = "this_quarter",
  LAST_QUARTER = "last_quarter",
  THIS_YEAR = "this_year",
  LAST_YEAR = "last_year",
}

// Enums for Commissions
export enum CommissionPaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Partial = "partial",
  Cancelled = "cancelled",
}

export enum CommissionStatus {
  PendingApproval = "pending_approval",
  Approved = "approved",
  Processed = "processed",
  Cancelled = "cancelled",
}
