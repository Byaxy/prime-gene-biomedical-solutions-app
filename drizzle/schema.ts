import { PaymentStatus, ShippingStatus } from "@/types";
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
  unique,
  index,
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

export const shippingStatusEnum = pgEnum("shipping_status", [
  "not_shipped",
  "shipped",
  "received",
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
  "purchase",
  "sale",
  "loan",
  "sale_reversal",
  "waybill_edit_reversal",
  "waybill_edit",
  "transfer",
  "adjustment",
  "backorder_fulfillment",
  "waybill_deletion_restore",
]);

export const promissoryNoteStatusEnum = pgEnum("promissory_note_status", [
  "pending",
  "fulfilled",
  "partial",
  "cancelled",
]);

export const waybillConversionStatusEnum = pgEnum("waybill_conversion_status", [
  "pending",
  "partial",
  "full",
]);

export const waybillTypeEnum = pgEnum("waybill_type", [
  "sale",
  "loan",
  "conversion",
]);

export const shipperTypeEnum = pgEnum("shipper_type", ["vendor", "courier"]);

export const shippingModeEnum = pgEnum("shipping_mode", [
  "express",
  "air",
  "sea",
]);

export const carrierTypeEnum = pgEnum("carrier_type", [
  "ExpressCargo",
  "AirCargo",
  "SeaCargo",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "in_transit",
  "delivered",
  "cancelled",
]);

export const packageTypeEnum = pgEnum("package_type", [
  "Box",
  "Carton",
  "Crate",
  "Pallet",
  "Bag",
  "Drum",
  "Roll",
]);

// Users
export const usersTable = pgTable(
  "users",
  {
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
  },
  (table) => ({
    usersActiveIndex: index("users_active_idx").on(table.isActive),
  })
);

// Units of measurement
export const unitsTable = pgTable(
  "units",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description").default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    unitsActiveIndex: index("units_active_idx").on(table.isActive),
  })
);

// Product Types
export const productTypesTable = pgTable(
  "product_types",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull().unique(),
    description: text("description").default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productTypesActiveIndex: index("product_types_active_idx").on(
      table.isActive
    ),
  })
);

// Brands
export const brandsTable = pgTable(
  "brands",
  {
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
  },
  (table) => ({
    brandsActiveIndex: index("brands_active_idx").on(table.isActive),
  })
);

// Categories
export const categoriesTable = pgTable(
  "categories",
  {
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
  },
  (table) => ({
    categoriesActiveIndex: index("categories_active_idx").on(table.isActive),
    categoriesParentIndex: index("categories_parent_idx").on(table.parentId),
  })
);

// Expenses
export const expensesTable = pgTable(
  "expenses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description").default(""),
    amount: numeric("amount").notNull(),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("cash"),
    expenseDate: timestamp("expense_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    expensesActiveIndex: index("expenses_active_idx").on(table.isActive),
  })
);

// Vendors
export const vendorsTable = pgTable(
  "vendors",
  {
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
  },
  (table) => ({
    vendorsActiveIndex: index("vendors_active_idx").on(table.isActive),
  })
);

// Customers
export const customersTable = pgTable(
  "customers",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone").notNull(),
    address: jsonb("address")
      .$type<{
        addressName: string;
        address: string;
        city: string;
        state: string;
        country: string;
      }>()
      .default({
        addressName: "",
        address: "",
        city: "",
        state: "",
        country: "",
      }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    customersActiveIndex: index("customers_active_idx").on(table.isActive),
  })
);

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
export const productsTable = pgTable(
  "products",
  {
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
    typeId: uuid("type_id").references(() => productTypesTable.id, {
      onDelete: "set null",
    }), // Foreign key to product types
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
  },
  (table) => ({
    productsProductIdIndex: index("products_product_id_idx").on(
      table.productID
    ),
    productsCategoryIdIndex: index("products_category_id_idx").on(
      table.categoryId
    ),
    productsBrandIdIndex: index("products_brand_id_idx").on(table.brandId),
    productsUnitIdIndex: index("products_unit_id_idx").on(table.unitId),
    productsTypeIdIndex: index("products_type_id_idx").on(table.typeId),
    productsActiveIndex: index("products_is_active_idx").on(table.isActive),
  })
);

// Stores
export const storesTable = pgTable(
  "stores",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    location: text("location").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    storesActiveIndex: index("stores_is_active_idx").on(table.isActive),
  })
);

// Inventory
export const inventoryTable = pgTable(
  "inventory",
  {
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
  },
  (table) => ({
    invenotryProductIdIndex: index("invenotry_product_id_idx").on(
      table.productId
    ),
    invenotryStoreIdIndex: index("invenotry_store_id_idx").on(table.storeId),
    invenotryActiveIndex: index("invenotry_is_active_idx").on(table.isActive),
  })
);

// Inventory Transactions Table
export const inventoryTransactionsTable = pgTable(
  "inventory_transactions",
  {
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
  },
  (table) => ({
    inventoryTransactionsProductIdIndex: index(
      "inventory_transactions_product_id_idx"
    ).on(table.productId),
    inventoryTransactionsStoreIdIndex: index(
      "inventory_transactions_store_id_idx"
    ).on(table.storeId),
    inventoryTransactionsUserIdIndex: index(
      "inventory_transactions_user_id_idx"
    ).on(table.userId),
    inventoryTransactionsInventoryIdIndex: index(
      "inventory_transactions_inventory_id_idx"
    ).on(table.inventoryId),
    inventoryTransactionsReferenceIdIndex: index(
      "inventory_transactions_reference_id_idx"
    ).on(table.referenceId),
    inventoryTransactionsActiveIndex: index(
      "inventory_transactions_is_active_idx"
    ).on(table.isActive),
  })
);

// Purchase Orders
export const purchaseOrdersTable = pgTable(
  "purchase_orders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseOrderNumber: text("purchase_order_number").notNull().unique(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }), // Foreign key to vendors
    totalAmount: numeric("total_amount").notNull(),
    purchaseOrderDate: timestamp("purchase_order_date").notNull(),
    status: purchaseStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    isConvertedToPurchase: boolean("is_converted_to_purchase")
      .notNull()
      .default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    purchaseOrdersVendorIdIndex: index("purchase_orders_vendor_id_idx").on(
      table.vendorId
    ),
    purchaseOrdersActiveIndex: index("purchase_orders_is_active_idx").on(
      table.isActive
    ),
  })
);

export const purchaseOrderItemsTable = pgTable(
  "purchase_order_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }), // Foreign key to purchases
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
    quantity: integer("quantity").notNull(),
    costPrice: numeric("cost_price").notNull(),
    totalPrice: numeric("total_price").notNull(),
    productName: text("product_name"),
    productID: text("product_ID"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    purchaseOrderItemsPurchaseOrderIdIndex: index(
      "purchase_order_items_purchase_order_id_idx"
    ).on(table.purchaseOrderId),
    purchaseOrderItemsProductIdIndex: index(
      "purchase_order_items_product_id_idx"
    ).on(table.productId),
    purchaseOrderItemsActiveIndex: index(
      "purchase_order_items_is_active_idx"
    ).on(table.isActive),
  })
);

// Purchases
export const purchasesTable = pgTable(
  "purchases",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseNumber: text("purchase_number").notNull().unique(),
    vendorInvoiceNumber: text("vendor_invoice_number").notNull(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }), // Foreign key to vendors
    purchaseOrderId: uuid("purchase_order_id").references(
      () => purchaseOrdersTable.id,
      { onDelete: "set null" }
    ), // Foreign key to purchase orders
    totalAmount: numeric("total_amount").notNull(),
    purchaseDate: timestamp("purchase_date").notNull(),
    status: purchaseStatusEnum("status").notNull().default("pending"),
    shippingStatus: shippingStatusEnum("shipping_status")
      .notNull()
      .default(ShippingStatus["Not Shipped"]),
    amountPaid: numeric("amount_paid").notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default(PaymentStatus.Pending),
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
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    purchasesVendorIdIndex: index("purchases_vendor_id_idx").on(table.vendorId),
    purchasesPurchaseOrderIdIndex: index("purchases_purchase_order_id_idx").on(
      table.purchaseOrderId
    ),
    purchasesActiveIndex: index("purchases_is_active_idx").on(table.isActive),
  })
);

// Purchase Items
export const purchaseItemsTable = pgTable(
  "purchase_items",
  {
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
    productName: text("product_name"),
    productID: text("product_ID"),
    quantityReceived: integer("quantity_received").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    purchaseItemsPurchaseIdIndex: index("purchase_items_purchase_id_idx").on(
      table.purchaseId
    ),
    purchaseItemsProductIdIndex: index("purchase_items_product_id_idx").on(
      table.productId
    ),
    purchaseItemsActiveIndex: index("purchase_items_is_active_idx").on(
      table.isActive
    ),
  })
);

// Receiving purchase items
export const receivingTable = pgTable(
  "receiving",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vendorParkingListNumber: text("vendor_parking_list_number").notNull(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchasesTable.id, { onDelete: "cascade" }), // Foreign key to purchases
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "set null" }), // Foreign key to vendors
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to stores
    receivingDate: timestamp("receiving_date").notNull(),
    totalAmount: numeric("total_amount").notNull(),
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
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    receivingPurchaseIdIndex: index("receiving_purchase_id_idx").on(
      table.purchaseId
    ),
    receivingVendorIdIndex: index("receiving_vendor_id_idx").on(table.vendorId),
    receivingStoreIdIndex: index("receiving_store_id_idx").on(table.storeId),
    receivingActiveIndex: index("receiving_is_active_idx").on(table.isActive),
  })
);

export const receivingItemsTable = pgTable(
  "receiving_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receivingId: uuid("receiving_id")
      .notNull()
      .references(() => receivingTable.id, { onDelete: "cascade" }), // Foreign key to receiving
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
    purchaseItemId: uuid("purchase_item_id")
      .notNull()
      .references(() => purchaseItemsTable.id, { onDelete: "cascade" }), // Foreign key to purchase items
    costPrice: numeric("cost_price").notNull(),
    sellingPrice: numeric("selling_price").notNull(),
    totalCost: numeric("total_cost").notNull(),
    productName: text("product_name"),
    productID: text("product_ID"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    receivingItemsReceivingIdIndex: index(
      "receiving_items_receiving_id_idx"
    ).on(table.receivingId),
    receivingItemsProductIdIndex: index("receiving_items_product_id_idx").on(
      table.productId
    ),
    receivingItemsPurchaseItemIdIndex: index(
      "receiving_items_purchase_item_id_idx"
    ).on(table.purchaseItemId),
    receivingItemsActiveIndex: index("receiving_items_is_active_idx").on(
      table.isActive
    ),
  })
);

export const receivingItemsInvetoryTable = pgTable(
  "receiving_items_inventory",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receivingItemId: uuid("receiving_item_id")
      .notNull()
      .references(() => receivingItemsTable.id, { onDelete: "cascade" }), // Foreign key to receiving
    lotNumber: text("lot_number").notNull(),
    quantity: integer("quantity").notNull(),
    manufactureDate: timestamp("manufacture_date"),
    expiryDate: timestamp("expiry_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    receivingItemsInventoryReceivingItemIdIndex: index(
      "receiving_items_inventory_receiving_item_id_idx"
    ).on(table.receivingItemId),
    receivingItemsInventoryActiveIndex: index(
      "receiving_items_inventory_is_active_idx"
    ).on(table.isActive),
  })
);

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
export const quotationsTable = pgTable(
  "quotations",
  {
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
  },
  (table) => ({
    quotationsCustomerCustomerIdIndex: index(
      "quotations_customer_customer_id_idx"
    ).on(table.customerId),
    quotationsActiveIndex: index("quotations_active_idx").on(table.isActive),
  })
);

// Quotation Items Table
export const quotationItemsTable = pgTable(
  "quotation_items",
  {
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
  },
  (table) => ({
    quotationItemsQuotationIdIndex: index(
      "quotation_items_quotation_id_idx"
    ).on(table.quotationId),
    quotationItemsProductIdIndex: index("quotation_items_product_id_idx").on(
      table.productId
    ),
    quotationItemsTaxRateIdIndex: index("quotation_items_tax_id_idx").on(
      table.taxRateId
    ),
    quotationItemsActiveIndex: index("quotation_items_active_idx").on(
      table.isActive
    ),
  })
);

// Sales Table
export const salesTable = pgTable(
  "sales",
  {
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
    subTotal: numeric("sub_total").notNull(),
    totalAmount: numeric("total_amount").notNull(),
    totalTaxAmount: numeric("total_tax_amount").notNull(),
    discountAmount: numeric("discount_amount").notNull(),
    amountPaid: numeric("amount_paid").notNull(),
    status: saleStatusEnum("status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("cash"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    notes: text("notes"),
    quotationId: uuid("quotation_id").references(() => quotationsTable.id, {
      onDelete: "set null",
    }), // Foreign key to quotation
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
    isDeliveryNoteCreated: boolean("is_delivery_note_created")
      .notNull()
      .default(false),
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
  },
  (table) => ({
    salesCustomerIdIndex: index("sales_customer_id_idx").on(table.customerId),
    salesStoreIdIndex: index("sales_store_id_idx").on(table.storeId),
    salesQuotationIdIndex: index("sales_quotation_id_idx").on(
      table.quotationId
    ),
    salesActiveIndex: index("sales_active_idx").on(table.isActive),
  })
);

// Sale Items Table
export const saleItemsTable = pgTable(
  "sale_items",
  {
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
    hasBackorder: boolean("has_backorder").notNull().default(false),
    backorderQuantity: integer("backorder_quantity").notNull().default(0),
    fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    saleItemsSaleIdIndex: index("sale_items_sale_id_idx").on(table.saleId),
    saleItemsProductIdIndex: index("sale_items_product_id_idx").on(
      table.productId
    ),
    saleItemsStoreIdIndex: index("sale_items_store_id_idx").on(table.storeId),
    saleItemsActiveIndex: index("sale_items_active_idx").on(table.isActive),
    saleItemsTaxRateIdIndex: index("sale_items_tax_rate_id_idx").on(
      table.taxRateId
    ),
  })
);

// Junction table for sale items and inventory stock
export const saleItemInventoryTable = pgTable(
  "sale_item_inventory",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => saleItemsTable.id, { onDelete: "cascade" }),
    inventoryStockId: uuid("inventory_stock_id")
      .notNull()
      .references(() => inventoryTable.id, { onDelete: "cascade" }),
    lotNumber: text("lot_number").notNull(),
    quantityToTake: integer("quantity_to_take").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Composite unique constraint
    saleItemInventoryUnique: unique().on(
      table.saleItemId,
      table.inventoryStockId
    ),
    saleItemInventorySaleItemIdIndex: index(
      "sale_item_inventory_sale_item_id_idx"
    ).on(table.saleItemId),
    saleItemInventoryInventoryStockIdIndex: index(
      "sale_item_inventory_inventory_stock_id_idx"
    ).on(table.inventoryStockId),
    saleItemInventoryActiveIndex: index("sale_item_inventory_active_idx").on(
      table.isActive
    ),
  })
);

// Backorder tracking per product-store
export const backordersTable = pgTable(
  "backorders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => saleItemsTable.id, { onDelete: "cascade" }),
    pendingQuantity: integer("pending_quantity").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    unq: unique().on(table.productId, table.storeId, table.saleItemId),
    backordersProductIdIndex: index("backorders_product_id_idx").on(
      table.productId
    ),
    backordersStoreIdIndex: index("backorders_store_id_idx").on(table.storeId),
    backordersSaleItemIdIndex: index("backorders_sale_item_id_idx").on(
      table.saleItemId
    ),
    backordersActiveIndex: index("backorders_active_idx").on(table.isActive),
  })
);

// Tracks fulfillment of backorders
export const backorderFulfillmentsTable = pgTable(
  "backorder_fulfillments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    backorderId: uuid("backorder_id")
      .notNull()
      .references(() => backordersTable.id, { onDelete: "cascade" }),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventoryTable.id, { onDelete: "cascade" }),
    fulfilledQuantity: integer("fulfilled_quantity").notNull(),
    fulfillmentDate: timestamp("fulfillment_date").defaultNow().notNull(),
  },
  (table) => ({
    backorderFulfillmentsBackorderIdIndex: index(
      "backorder_fulfillments_backorder_id_idx"
    ).on(table.backorderId),
    backorderFulfillmentsInventoryIdIndex: index(
      "backorder_fulfillments_inventory_id_idx"
    ).on(table.inventoryId),
  })
);

// Deliveries Table
export const deliveriesTable = pgTable(
  "deliveries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    deliveryDate: timestamp("delivery_date").notNull(),
    deliveryRefNumber: text("delivery_ref_number").notNull().unique(),
    status: deliveryStatusEnum("status").notNull().default("pending"),

    deliveredBy: text("delivered_by").notNull(),
    receivedBy: text("received_by").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }), // Foreign key to customers
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to stores
    saleId: uuid("sale_id").references(() => salesTable.id, {
      onDelete: "cascade",
    }), // Foreign key to sales
    notes: text("notes"),
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
  },
  (table) => ({
    deliveriesCustomerIdIndex: index("deliveries_customer_id_idx").on(
      table.customerId
    ),
    deliveriesStoreIdIndex: index("deliveries_store_id_idx").on(table.storeId),
    deliveriesSaleIdIndex: index("deliveries_sale_id_idx").on(table.saleId),
    deliveriesActiveIndex: index("deliveries_active_idx").on(table.isActive),
  })
);

// Delivery Items Table
export const deliveryItemsTable = pgTable(
  "delivery_items",
  {
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
    productName: text("product_name"),
    productID: text("product_ID"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    deliveryItemsDeliveryIdIndex: index("delivery_items_delivery_id_idx").on(
      table.deliveryId
    ),
    deliveryItemsProductIdIndex: index("delivery_items_product_id_idx").on(
      table.productId
    ),
    deliveryItemsActiveIndex: index("delivery_items_active_idx").on(
      table.isActive
    ),
  })
);

// Waybills table
export const waybillsTable = pgTable(
  "waybills",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    waybillRefNumber: text("waybill_ref_number").notNull().unique(),
    waybillDate: timestamp("waybill_date").notNull(),
    saleId: uuid("sale_id").references(() => salesTable.id, {
      onDelete: "cascade",
    }), // Optional reference to a sale
    storeId: uuid("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }), // Foreign key to the store sending the goods
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }), // Foreign key to the customer
    waybillType: waybillTypeEnum("waybill_type").default("sale"), // 'sale' or 'loan'
    isConverted: boolean("is_converted").notNull().default(false),
    conversionDate: timestamp("conversion_date"),
    conversionStatus: waybillConversionStatusEnum("conversion_status"),
    originalLoanWaybillId: uuid("original_loan_waybill_id").references(
      (): PgColumn => waybillsTable.id,
      {
        onDelete: "cascade",
      }
    ), // For converted waybills
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
    deliveredBy: text("delivered_by").notNull(),
    receivedBy: text("received_by").notNull(),
    status: deliveryStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    waybillsCustomerIdIndex: index("waybills_customer_id_idx").on(
      table.customerId
    ),
    waybillsStoreIdIndex: index("waybills_store_id_idx").on(table.storeId),
    waybillsSaleIdIndex: index("waybills_sale_id_idx").on(table.saleId),
    waybillsActiveIndex: index("waybills_active_idx").on(table.isActive),
  })
);

// Waybill Items Table
export const waybillItemsTable = pgTable(
  "waybill_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    waybillId: uuid("waybill_id")
      .notNull()
      .references(() => waybillsTable.id, { onDelete: "cascade" }), // Foreign key to the waybill
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to the product
    saleItemId: uuid("sale_item_id").references(() => saleItemsTable.id, {
      onDelete: "cascade",
    }),
    quantityRequested: integer("quantity_requested").notNull(),
    quantitySupplied: integer("quantity_supplied").notNull(),
    balanceLeft: integer("balance_left").notNull(),
    fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
    quantityConverted: integer("quantity_converted").notNull().default(0),
    productName: text("product_name"),
    productID: text("product_ID"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    waybillItemsProductIdIndex: index("waybill_items_product_id_idx").on(
      table.productId
    ),
    waybillItemsWaybillIdIndex: index("waybill_items_waybill_id_idx").on(
      table.waybillId
    ),
    waybillItemsSaleItemIdIndex: index("waybill_items_sale_item_id_idx").on(
      table.saleItemId
    ),
    waybillItemsActiveIndex: index("waybill_items_active_idx").on(
      table.isActive
    ),
  })
);

// Waybill Items Inventory stock
export const waybillItemInventoryTable = pgTable(
  "waybill_item_inventory",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    waybillItemId: uuid("waybill_item_id")
      .notNull()
      .references(() => waybillItemsTable.id, { onDelete: "cascade" }),
    inventoryStockId: uuid("inventory_stock_id")
      .notNull()
      .references(() => inventoryTable.id, { onDelete: "cascade" }),
    lotNumber: text("lot_number").notNull(),
    quantityTaken: integer("quantity_taken").notNull(),
    unitPrice: numeric("unit_price").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    waybillItemInventoryWaybillItemIdIndex: index(
      "waybill_item_inventory_waybill_item_id_idx"
    ).on(table.waybillItemId),
    waybillItemInventoryInventoryStockIdIndex: index(
      "waybill_item_inventory_inventory_stock_id_idx"
    ).on(table.inventoryStockId),
    waybillItemInventoryActiveIndex: index(
      "waybill_item_inventory_active_idx"
    ).on(table.isActive),
  })
);

// Promissory Notes
export const promissoryNotesTable = pgTable(
  "promissory_notes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    promissoryNoteRefNumber: text("promissory_note_ref_number")
      .notNull()
      .unique(),
    promissoryNoteDate: timestamp("promissory_note_date").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }), // Foreign key to customers
    saleId: uuid("sale_id")
      .notNull()
      .references(() => salesTable.id, {
        onDelete: "cascade",
      }), // Optional reference to the sales invoice
    status: promissoryNoteStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount").notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    promissoryNotesCustomerIdIndex: index(
      "promissory_notes_customer_id_idx"
    ).on(table.customerId),
    promissoryNotesSaleIdIndex: index("promissory_notes_sale_id_idx").on(
      table.saleId
    ),
    promissoryNotesActiveIndex: index("promissory_notes_active_idx").on(
      table.isActive
    ),
  })
);

// Promissory Note Items Table
export const promissoryNoteItemsTable = pgTable(
  "promissory_note_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    promissoryNoteId: uuid("promissory_note_id")
      .notNull()
      .references(() => promissoryNotesTable.id, { onDelete: "cascade" }), // Foreign key to promissory notes
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }), // Foreign key to products
    saleItemId: uuid("sale_item_id").references(() => saleItemsTable.id, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price").notNull(),
    subTotal: numeric("sub_total").notNull(),
    fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
    productName: text("product_name"),
    productID: text("product_ID"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    promissoryNoteItemsPromissoryNoteIdIndex: index(
      "promissory_note_items_promissory_note_id_idx"
    ).on(table.promissoryNoteId),
    promissoryNoteItemsProductIdIndex: index(
      "promissory_note_items_product_id_idx"
    ).on(table.productId),
    promissoryNoteItemsSaleItemIdIndex: index(
      "promissory_note_items_sale_item_id_idx"
    ).on(table.saleItemId),
    promissoryNoteItemsActiveIndex: index(
      "promissory_note_items_active_idx"
    ).on(table.isActive),
  })
);

// Tax rates table
export const taxRatesTable = pgTable(
  "tax_rates",
  {
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
  },
  (table) => ({
    taxRatesActiveIndex: index("tax_rates_active_idx").on(table.isActive),
  })
);

// shippments
export const shipmentsTable = pgTable(
  "shipments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shipmentRefNumber: text("shipment_ref_number").notNull().unique(),
    numberOfPackages: integer("number_of_packages").notNull(),
    totalItems: integer("total_items").notNull(),
    shippingMode: shippingModeEnum("shipping_mode").notNull(),
    shipperType: shipperTypeEnum("shipper_type").notNull(),
    shippingVendorId: uuid("shipping_vendor_id").references(
      () => vendorsTable.id,
      { onDelete: "set null" }
    ),
    shipperName: text("shipper_name"),
    shipperAddress: text("shipper_address"),
    carrierType: carrierTypeEnum("carrier_type").notNull(),
    carrierName: text("carrier_name").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    shippingDate: timestamp("shipping_date").notNull(),
    estimatedArrivalDate: timestamp("estimated_arrival_date"),
    dateShipped: timestamp("date_shipped"),
    actualArrivalDate: timestamp("actual_arrival_date"),
    totalAmount: numeric("total_amount").notNull(),
    status: shipmentStatusEnum("status").notNull().default("pending"),
    originPort: text("origin_port"),
    destinationPort: text("destination_port"),
    containerNumber: text("container_number"),
    flightNumber: text("flight_number"),
    notes: text("notes").default(""),
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
    purchaseIds: uuid("purchase_ids").array(),
    vendorIds: uuid("vendor_ids").array(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    shipmentsActiveIndex: index("shippments_active_idx").on(table.isActive),
    shipmentsPurchaseIdsIndex: index("shippments_purchase_ids_idx").on(
      table.purchaseIds
    ),
    shipmentsVendorIdsIndex: index("shippments_vendor_ids_idx").on(
      table.vendorIds
    ),
  })
);

// Parcels
export const parcelsTable = pgTable(
  "parcels",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shipmentId: uuid("shipment_id").references(() => shipmentsTable.id, {
      onDelete: "cascade",
    }),
    parcelNumber: text("parcel_number").notNull(),
    packageType: packageTypeEnum("package_type").notNull(),
    length: numeric("length").notNull(),
    width: numeric("width").notNull(),
    height: numeric("height").notNull(),
    netWeight: numeric("net_weight").notNull(),
    grossWeight: numeric("gross_weight").notNull(),
    volumetricWeight: numeric("volumetric_weight").notNull(),
    chargeableWeight: numeric("chargeable_weight").notNull(),
    volumetricDivisor: numeric("volumetric_divisor").notNull(),
    unitPricePerKg: numeric("unit_price_per_kg").notNull(),
    totalAmount: numeric("total_amount").notNull(),
    totalItems: integer("total_items").notNull(),
    description: text("description").default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    parcelsActiveIndex: index("parcels_active_idx").on(table.isActive),
    parcelsShipmentIdIndex: index("parcels_shipment_id_idx").on(
      table.shipmentId
    ),
  })
);

export const parcelItemsTable = pgTable(
  "parcel_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parcelId: uuid("parcel_id").references(() => parcelsTable.id, {
      onDelete: "cascade",
    }),
    productId: uuid("product_id").references(() => productsTable.id, {
      onDelete: "set null",
    }),
    quantity: integer("quantity").notNull(),
    productName: text("product_name"),
    productID: text("product_ID"),
    productUnit: text("product_unit"),
    netWeight: numeric("net_weight").notNull(),
    isPurchaseItem: boolean("is_purchase_item").notNull(),
    purchaseReference: text("purchase_reference"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    parcelItemsActiveIndex: index("parcel_items_active_idx").on(table.isActive),
    parcelItemsParcelIdIndex: index("parcel_items_parcel_id_idx").on(
      table.parcelId
    ),
    parcelItemsProductIdIndex: index("parcel_items_product_id_idx").on(
      table.productId
    ),
  })
);
