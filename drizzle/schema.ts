import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  PgColumn,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// A custom numeric type that parses to number
const numeric = customType<{ data: number; driverData: string }>({
  dataType() {
    return "numeric(12, 2)";
  },
  toDriver(value: number): string {
    return value.toString();
  },
  fromDriver(value: string): number {
    return parseFloat(value);
  },
});

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "check",
  "mobile-money",
  "bank",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "in-progress",
  "delivered",
  "cancelled",
]);

export const quotationStatusEnum = pgEnum("quotation_status", [
  "pending",
  "completed",
  "cancelled",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "pending",
  "completed",
  "cancelled",
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "partial",
  "paid",
  "due",
]);

export const productTransferStatusEnum = pgEnum("product_status", [
  "pending",
  "completed",
  "cancelled",
]);

export const quotationItemStatusEnum = pgEnum("quotation_item_status", [
  "available",
  "out_of_stock",
  "pending",
]);

export const inventoryTransactionTypeEnum = pgEnum("transaction_type", [
  "purchase", // Items received from a vendor
  "sale", // Items sold to a customer
  "transfer", // Items transferred between stores
  "adjustment", // Manual adjustment to inventory
]);

export const promissoryNoteStatusEnum = pgEnum("promissory_note_status", [
  "pending",
  "fulfilled",
  "partially_fulfilled",
  "cancelled",
]);

// Users
export const usersTable = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  role: text("role").notNull(),
  profileImageId: text("profile_image_id"),
  profileImageUrl: text("profile_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Units of measurement
export const unitsTable = pgTable("units", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description").default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product Types
export const productTypesTable = pgTable("product_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Brands
export const brandsTable = pgTable("brands", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  imageId: text("image_id"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories
export const categoriesTable = pgTable("categories", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  parentId: uuid("parent_id").references((): PgColumn => categoriesTable.id, {
    onDelete: "set null",
  }),
  path: text("path"),
  depth: integer("depth").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Expenses
export const expensesTable = pgTable("expenses", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").default(""),
  amount: numeric("amount").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  expenseDate: timestamp("expense_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vendors
export const vendorsTable = pgTable("vendors", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customers
export const customersTable = pgTable("customers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company Settings
export const companySettingsTable = pgTable("company_settings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  logoId: text("logo_id"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull(),
  currencySymbol: text("currency_symbol").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products Table
export const productsTable = pgTable("products", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  productID: text("product_id").notNull().unique(),
  description: text("description").default(""),
  costPrice: numeric("cost_price").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  quantity: integer("quantity").notNull(),
  alertQuantity: integer("alert_quantity").default(1),
  maxAlertQuantity: integer("max_alert_quantity").default(5),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "set null" }), // Foreign key to categories
  typeId: uuid("type_id")
    .notNull()
    .references(() => productTypesTable.id, { onDelete: "set null" }), // Foreign key to product types
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brandsTable.id, { onDelete: "set null" }), // Foreign key to brands
  unitId: uuid("unit_id")
    .notNull()
    .references(() => unitsTable.id, { onDelete: "set null" }), // Foreign key to units
  imageId: text("image_id"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stores
export const storesTable = pgTable("stores", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory
export const inventoryTable = pgTable("inventory", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  storeId: uuid("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to stores
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  costPrice: numeric("cost_price").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  manufactureDate: timestamp("manufacture_date"),
  expiryDate: timestamp("expiry_date"),
  receivedDate: timestamp("received_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Transactions Table
export const inventoryTransactionsTable = pgTable("inventory_transactions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "set null" }), // Foreign key to products
  storeId: uuid("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "set null" }), // Foreign key to stores
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "set null" }), // Foreign key to users
  inventoryId: uuid("inventory_id").references(() => inventoryTable.id, {
    onDelete: "set null",
  }), // Foreign key to inventory
  transactionType: inventoryTransactionTypeEnum("transaction_type").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  referenceId: uuid("reference_id"), // Foreign key to related table (e.g., purchase, sale, transfer)
  notes: text("notes").default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchases
export const purchasesTable = pgTable("purchases", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  purchaseOrderNumber: text("purchase_order_number").notNull().unique(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "set null" }), // Foreign key to vendors
  totalAmount: numeric("total_amount").notNull(),
  amountPaid: numeric("amount_paid").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  status: purchaseStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  deliveryStatus: deliveryStatusEnum("delivery_status")
    .notNull()
    .default("pending"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchase Items
export const purchaseItemsTable = pgTable("purchase_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references(() => purchasesTable.id, { onDelete: "cascade" }), // Foreign key to purchases
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  quantity: integer("quantity").notNull(),
  costPrice: numeric("cost_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Receiving purchase items
export const receivingTable = pgTable("receiving", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references(() => purchasesTable.id, { onDelete: "cascade" }), // Foreign key to purchases
  purchaseItemId: uuid("purchase_item_id")
    .notNull()
    .references(() => purchaseItemsTable.id, { onDelete: "cascade" }), // Foreign key to purchase items
  lotNumber: text("lot_number").notNull(),
  quantityReceived: integer("quantity_received").notNull(),
  costPrice: numeric("cost_price").notNull(),
  manufactureDate: timestamp("manufacture_date"),
  expiryDate: timestamp("expiry_date"),
  receivedDate: timestamp("received_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product transfers between stores
export const transfersTable = pgTable("transfers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromStoreId: uuid("from_store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to source store
  toStoreId: uuid("to_store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to destination store
  transferDate: timestamp("transfer_date").notNull(),
  status: productTransferStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product transfer items between stores
export const transferItemsTable = pgTable("transfer_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  transferId: uuid("transfer_id")
    .notNull()
    .references(() => transfersTable.id, { onDelete: "cascade" }), // Foreign key to transfers
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  costPrice: numeric("cost_price").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  manufactureDate: timestamp("manufacture_date"),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quotations Table
export const quotationsTable = pgTable("quotations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quotationNumber: text("quotation_number").notNull().unique(),
  rfqNumber: text("rfq_number").default(""),
  quotationDate: timestamp("quotation_date").notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "set null" }), // Foreign key to customers
  subTotal: numeric("sub_total").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  totalTaxAmount: numeric("total_tax_amount").notNull(),
  discountAmount: numeric("discount_amount").notNull(),
  status: quotationStatusEnum("status").notNull().default("pending"),
  convertedToSale: boolean("converted_to_sale").notNull().default(false), // Track if converted to sale
  notes: text("notes"),
  attachments: jsonb("attachments")
    .$type<
      Array<{
        id: string;
        url: string;
        name: string;
        size: number;
        type: string;
      }>
    >()
    .default([]),
  isDeliveryAddressAdded: boolean("is_delivery_address_added")
    .notNull()
    .default(false),
  deliveryAddress: jsonb("delivery_address")
    .$type<{
      addressName: string;
      address: string;
      city: string;
      state: string;
      country: string;
      email: string;
      phone: string;
    }>()
    .default({
      addressName: "",
      address: "",
      city: "",
      state: "",
      country: "",
      email: "",
      phone: "",
    }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quotation Items Table
export const quotationItemsTable = pgTable("quotation_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotationsTable.id, { onDelete: "cascade" }), // Foreign key to quotations
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  taxRateId: uuid("tax_id")
    .notNull()
    .references(() => taxRatesTable.id, { onDelete: "set null" }), // Foreign key to customers
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  subTotal: numeric("sub_total").notNull(),
  taxAmount: numeric("tax_amount").notNull(),
  taxRate: numeric("tax_rate").default(0),
  discountAmount: numeric("discount_amount").notNull(),
  discountRate: numeric("discount_rate").default(0),
  productName: text("product_name"),
  productID: text("product_ID"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sales Table
export const salesTable = pgTable("sales", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  saleDate: timestamp("sale_date").notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "set null" }), // Foreign key to customers
  storeId: uuid("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to stores
  totalAmount: numeric("total_amount").notNull(),
  amountPaid: numeric("amount_paid").notNull(),
  status: saleStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  notes: text("notes"),
  quotationId: uuid("quotation_id").references(() => quotationsTable.id, {
    onDelete: "set null",
  }), // Foreign key to quotations
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sale Items Table
export const saleItemsTable = pgTable("sale_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => salesTable.id, { onDelete: "cascade" }), // Foreign key to sales
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  storeId: uuid("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to stores
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Deliveries Table
export const deliveriesTable = pgTable("deliveries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deliveryDate: timestamp("delivery_date").notNull(),
  deliveryRefNumber: text("delivery_ref_number").notNull().unique(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  deliveryAddress: text("address").notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "set null" }), // Foreign key to customers
  storeId: uuid("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to stores
  saleId: uuid("sale_id").references(() => salesTable.id, {
    onDelete: "set null",
  }), // Foreign key to sales
  quotationId: uuid("quotation_id").references(() => quotationsTable.id, {
    onDelete: "set null",
  }), // Foreign key to quotations
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Items Table
export const deliveryItemsTable = pgTable("delivery_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deliveryId: uuid("delivery_id")
    .notNull()
    .references(() => deliveriesTable.id, { onDelete: "cascade" }), // Foreign key to deliveries
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  quantityRequested: integer("quantity_requested").notNull(),
  quantitySupplied: integer("quantity_supplied").notNull(),
  balanceLeft: integer("balance_left").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Promissory Notes
export const promissoryNotesTable = pgTable("promissory_notes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  promissoryNoteNumber: text("promissory_note_number").notNull().unique(),
  promissoryNoteDate: timestamp("promissory_note_date").notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "set null" }), // Foreign key to customers
  salesId: uuid("sales_id").references(() => salesTable.id, {
    onDelete: "set null",
  }), // Optional reference to the sales invoice
  deliveryId: uuid("delivery_id").references(() => deliveriesTable.id, {
    onDelete: "set null",
  }), // Optional reference to a delivery
  status: promissoryNoteStatusEnum("status").notNull().default("pending"),
  totalAmount: numeric("total_amount").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Promissory Note Items Table
export const promissoryNoteItemsTable = pgTable("promissory_note_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  promissoryNoteId: uuid("promissory_note_id")
    .notNull()
    .references(() => promissoryNotesTable.id, { onDelete: "cascade" }), // Foreign key to promissory notes
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  subTotal: numeric("sub_total").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Waybills table
export const waybillsTable = pgTable("waybills", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  waybillNumber: text("waybill_number").notNull().unique(),
  waybillDate: timestamp("waybill_date").notNull(),
  fromStoreId: uuid("from_store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to the store sending the goods
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "set null" }), // Foreign key to the customer
  deliveryAddress: text("delivery_address").notNull(),
  transportationFee: numeric("transportation_fee").notNull().default(0.0),
  totalAmount: numeric("total_amount").notNull(),
  saleId: uuid("sale_id").references(() => salesTable.id, {
    onDelete: "set null",
  }), // Optional reference to a sale
  deliveryId: uuid("delivery_id").references(() => deliveriesTable.id, {
    onDelete: "set null",
  }), // Optional reference to a delivery
  status: deliveryStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Waybill Items Table
export const waybillItemsTable = pgTable("waybill_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  waybillId: uuid("waybill_id")
    .notNull()
    .references(() => waybillsTable.id, { onDelete: "cascade" }), // Foreign key to the waybill
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to the product
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  subTotal: numeric("sub_total").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tax rates table
export const taxRatesTable = pgTable("tax_rates", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  taxRate: numeric("tax_rate").notNull(),
  code: text("code").notNull(), // e.g., "VAT", "GST"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Junction tables

// Junction Table for Many-to-Many Relationship between Products and Vendors
export const productVendorsTable = pgTable("product_vendors", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "cascade" }), // Foreign key to vendors
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
