import { PaymentStatus, ShippingStatus } from "@/types";
import { relations, sql } from "drizzle-orm";
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

export const chartOfAccountTypeEnum = pgEnum("chart_of_account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
  "other",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "bank",
  "mobile_money",
  "cash_on_hand",
  "other",
]);

export const journalEntryReferenceTypeEnum = pgEnum(
  "journal_entry_reference_type",
  [
    "purchase",
    "sale",
    "expense",
    "payment_received",
    "bill_payment",
    "adjustment",
    "commission_payment",
  ]
);

export const commissionPaymentStatusEnum = pgEnum("commission_payment_status", [
  "pending",
  "paid",
  "partial",
  "cancelled",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending_approval",
  "approved",
  "processed",
  "cancelled",
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
    unitsNameIndex: index("units_name_idx").on(table.name),
    unitsNameGinIdx: sql`CREATE INDEX units_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
    unitsDescriptionGinIdx: sql`CREATE INDEX units_description_gin_idx ON ${table} USING GIN (${table.description} gin_trgm_ops);`,
    unitsCodeGinIdx: sql`CREATE INDEX units_code_gin_idx ON ${table} USING GIN (${table.code} gin_trgm_ops);`,
    unitsActiveNameIdx: index("units_active_name_idx").on(
      table.isActive,
      table.name
    ),
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
    productTypesNameIndex: index("product_types_name_idx").on(table.name),
    productTypesNameGinIdx: sql`CREATE INDEX product_types_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
    productTypesDescriptionGinIdx: sql`CREATE INDEX product_types_description_gin_idx ON ${table} USING GIN (${table.description} gin_trgm_ops);`,
    productTypesActiveNameIdx: index("product_types_active_name_idx").on(
      table.isActive,
      table.name
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
    brandsNameIndex: index("brands_name_idx").on(table.name),
    brandsNameGinIdx: sql`CREATE INDEX brands_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
    brandsDescriptionGinIdx: sql`CREATE INDEX brands_description_gin_idx ON ${table} USING GIN (${table.description} gin_trgm_ops);`,
    brandsActiveNameIdx: index("brands_active_name_idx").on(
      table.isActive,
      table.name
    ),
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
    categoriesNameIndex: index("categories_name_idx").on(table.name),
    categoriesNameGinIdx: sql`CREATE INDEX categories_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
    categoriesDescriptionGinIdx: sql`CREATE INDEX categories_description_gin_idx ON ${table} USING GIN (${table.description} gin_trgm_ops);`,
    categoriesActiveNameIdx: index("categories_active_name_idx").on(
      table.isActive,
      table.name
    ),
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
    vendorsActiveIndex: index("vendors_active_idx").on(table.isActive),
    vendorsNameIndex: index("vendors_name_idx").on(table.name),
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
    customersNameIndex: index("customers_name_idx").on(table.name),
    customersNameGinIdx: sql`CREATE INDEX customers_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
    customersEmailGinIdx: sql`CREATE INDEX customers_email_gin_idx ON ${table} USING GIN (${table.email} gin_trgm_ops);`,
    customersPhoneGinIdx: sql`CREATE INDEX customers_phone_gin_idx ON ${table} USING GIN (${table.phone} gin_trgm_ops);`,
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
    productsNameIndex: index("products_name_idx").on(table.name),
    productsCategoryIdIndex: index("products_category_id_idx").on(
      table.categoryId
    ),
    productsBrandIdIndex: index("products_brand_id_idx").on(table.brandId),
    productsUnitIdIndex: index("products_unit_id_idx").on(table.unitId),
    productsTypeIdIndex: index("products_type_id_idx").on(table.typeId),
    productsActiveIndex: index("products_is_active_idx").on(table.isActive),

    // GIN indexes for full-text search capabilities with ILIKE
    productsNameGinIdx: sql`CREATE INDEX products_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
    productsProductIdGinIdx: sql`CREATE INDEX products_product_id_gin_idx ON ${table} USING GIN (${table.productID} gin_trgm_ops);`,
    productsDescriptionGinIdx: sql`CREATE INDEX products_description_gin_idx ON ${table} USING GIN (${table.description} gin_trgm_ops);`,
    // Indexes for number filters
    productsCostPriceIdx: index("products_cost_price_idx").on(table.costPrice),
    productsSellingPriceIdx: index("products_selling_price_idx").on(
      table.sellingPrice
    ),

    // Composite indexes for common filter combinations
    productsActiveCategoryIdx: index("products_active_category_idx").on(
      table.isActive,
      table.categoryId
    ),
    productsActiveBrandIdx: index("products_active_brand_idx").on(
      table.isActive,
      table.brandId
    ),
    productsActiveTypeIdx: index("products_active_type_idx").on(
      table.isActive,
      table.typeId
    ),
    productsActiveUnitIdx: index("products_active_unit_idx").on(
      table.isActive,
      table.unitId
    ),
    productsActiveCreatedIdx: index("products_active_created_idx").on(
      table.isActive,
      table.createdAt
    ),
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
    storesNameGinIdx: sql`CREATE INDEX stores_name_gin_idx ON ${table} USING GIN (${table.name} gin_trgm_ops);`,
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
    receivedDate: timestamp("received_date").defaultNow().notNull(),
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
    invenotryLotNumberGinIdx: sql`CREATE INDEX invenotry_lot_number_gin_idx ON ${table} USING GIN (${table.lotNumber} gin_trgm_ops);`,
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
    dueDate: timestamp("due_date")
      .notNull()
      .default(sql`now() + interval '30 days'`), // Default to 30 days from creation
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
    isCommissionApplied: boolean("is_commission_applied")
      .notNull()
      .default(false),
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
    originalPendingQuantity: integer("original_pending_quantity")
      .notNull()
      .default(0),
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

// Chart of Accounts
export const chartOfAccountsTable = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountName: text("account_name").notNull(),
    accountType: chartOfAccountTypeEnum("account_type").notNull(),
    description: text("description").default(""),
    parentId: uuid("parent_id").references(
      (): PgColumn => chartOfAccountsTable.id,
      {
        onDelete: "set null",
      }
    ),
    path: text("path"),
    depth: integer("depth").default(0),
    isControlAccount: boolean("is_control_account").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    chartOfAccountsActiveIndex: index("chart_of_accounts_active_idx").on(
      table.isActive
    ),
    chartOfAccountsIdIndex: index("chart_of_accounts_id_idx").on(table.id),
  })
);

export const chartOfAccountsRelations = relations(
  chartOfAccountsTable,
  ({ one, many }) => ({
    parent: one(chartOfAccountsTable, {
      fields: [chartOfAccountsTable.parentId],
      references: [chartOfAccountsTable.id],
      relationName: "parentChild",
    }),
    children: many(chartOfAccountsTable, {
      relationName: "parentChild",
    }),
    accounts: many(accountsTable),
    expenseCategories: many(expenseCategoriesTable),
    incomeCategories: many(incomeCategoriesTable),
  })
);

// Accounts
export const accountsTable = pgTable(
  "accounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    accountType: accountTypeEnum("account_type").notNull(),
    accountNumber: text("account_number").unique(),
    bankName: text("bank_name"),
    bankAddress: jsonb("bank_address")
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
    swiftCode: text("swift_code"),
    merchantCode: text("merchant_code"),
    openingBalance: numeric("opening_balance").notNull(),
    currentBalance: numeric("current_balance").notNull(),
    currency: text("currency").notNull(),
    chartOfAccountsId: uuid("chart_of_accounts_id").references(
      () => chartOfAccountsTable.id,
      {
        onDelete: "cascade",
      }
    ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accountsActiveIndex: index("accounts_active_idx").on(table.isActive),
    accountsIdIndex: index("accounts_id_idx").on(table.id),
  })
);

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  chartOfAccount: one(chartOfAccountsTable, {
    fields: [accountsTable.chartOfAccountsId],
    references: [chartOfAccountsTable.id],
  }),
}));

// Expense Categories
export const expenseCategoriesTable = pgTable(
  "expense_categories",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description").default(""),
    chartOfAccountsId: uuid("chart_of_accounts_id").references(
      () => chartOfAccountsTable.id,
      {
        onDelete: "cascade",
      }
    ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    expenseCategoriesActiveIndex: index("expense_categories_active_idx").on(
      table.isActive
    ),
    expenseCategoriesIdIndex: index("expense_categories_id_idx").on(table.id),
  })
);

export const expenseCategoriesRelations = relations(
  expenseCategoriesTable,
  ({ one }) => ({
    chartOfAccount: one(chartOfAccountsTable, {
      fields: [expenseCategoriesTable.chartOfAccountsId],
      references: [chartOfAccountsTable.id],
    }),
  })
);

// Income Categories
export const incomeCategoriesTable = pgTable(
  "income_categories",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description").default(""),
    chartOfAccountsId: uuid("chart_of_accounts_id").references(
      () => chartOfAccountsTable.id,
      {
        onDelete: "cascade",
      }
    ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    incomeCategoriesActiveIndex: index("income_categories_active_idx").on(
      table.isActive
    ),
    incomeCategoriesIdIndex: index("income_categories_id_idx").on(table.id),
  })
);

// Journal Entries
export const journalEntriesTable = pgTable(
  "journal_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    entryDate: timestamp("entry_date").notNull(),
    referenceType: journalEntryReferenceTypeEnum("reference_type").notNull(),
    referenceId: uuid("reference_id"),
    description: text("description").default(""),
    totalDebit: numeric("total_debit").notNull(),
    totalCredit: numeric("total_credit").notNull(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    journalEntriesIdIndex: index("journal_entries_id_idx").on(table.id),
  })
);

export const journalEntryLinesTable = pgTable(
  "journal_entry_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntriesTable.id,
      {
        onDelete: "cascade",
      }
    ),
    chartOfAccountsId: uuid("chart_of_accounts_id").references(
      () => chartOfAccountsTable.id,
      {
        onDelete: "cascade",
      }
    ),
    description: text("description").default(""),
    debit: numeric("debit").notNull(),
    credit: numeric("credit").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    journalEntryLinesIdIndex: index("journal_entry_lines_id_idx").on(table.id),
    journalEntryLinesActiveIndex: index("journal_entry_lines_active_idx").on(
      table.isActive
    ),
  })
);

// Expenses
export const expensesTable = pgTable(
  "expenses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    amount: numeric("amount").notNull(),
    expenseDate: timestamp("expense_date").notNull(),
    referenceNumber: text("reference_number").notNull().unique(),
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
    expensesActiveIndex: index("expenses_active_idx").on(table.isActive),
    expensesExpenseDateIndex: index("expenses_expense_date_idx").on(
      table.expenseDate
    ),
  })
);

export const expenseItemsTable = pgTable(
  "expense_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expensesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    itemAmount: numeric("item_amount").notNull(),
    payingAccountId: uuid("paying_account_id").references(
      () => accountsTable.id,
      {
        onDelete: "cascade",
      }
    ),
    expenseCategoryId: uuid("expense_category_id")
      .notNull()
      .references(() => expenseCategoriesTable.id, { onDelete: "set null" }),
    payee: text("payee").notNull(),
    notes: text("notes"),
    isAccompanyingExpense: boolean("is_accompanying_expense")
      .notNull()
      .default(false),
    purchaseId: uuid("purchase_id").references(() => purchasesTable.id, {
      onDelete: "set null",
    }),
    accompanyingExpenseTypeId: uuid("accompanying_expense_type_id").references(
      () => accompanyingExpenseTypesTable.id,
      { onDelete: "set null" }
    ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    expenseItemsExpenseIdIndex: index("expense_items_expense_id_idx").on(
      table.expenseId
    ),
    expenseItemsCategoryIdIndex: index("expense_items_category_id_idx").on(
      table.expenseCategoryId
    ),
    expenseItemsPurchaseIdIndex: index("expense_items_purchase_id_idx").on(
      table.purchaseId
    ),
    expensesItemPayingAccountIdIndex: index(
      "expenses_item_paying_account_id_idx"
    ).on(table.payingAccountId),
  })
);

export const accompanyingExpenseTypesTable = pgTable(
  "accompanying_expense_types",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull().unique(),
    description: text("description").default(""),
    defaultExpenseCategoryId: uuid("default_expense_category_id").references(
      () => expenseCategoriesTable.id,
      { onDelete: "set null" }
    ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    accompanyingExpenseTypesActiveIndex: index(
      "accompanying_expense_types_active_idx"
    ).on(table.isActive),
    accompanyingExpenseTypesNameIndex: index(
      "accompanying_expense_types_name_idx"
    ).on(table.name),
  })
);

export const paymentsReceivedTable = pgTable(
  "payments_received",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    paymentRefNumber: text("payment_ref_number").notNull().unique(),
    paymentDate: timestamp("payment_date").notNull(),
    customerId: uuid("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
    }), // Nullable for other income not tied to a specific customer
    saleId: uuid("sale_id").references(() => salesTable.id, {
      onDelete: "set null",
    }), // Can be null if general payment not linked to specific sale initially
    incomeCategoryId: uuid("income_category_id").references(
      () => incomeCategoriesTable.id,
      { onDelete: "set null" }
    ), // For other income, or default for sales income
    isReceiptGenerated: boolean("is_receipt_generated")
      .notNull()
      .default(false),
    receivingAccountId: uuid("receiving_account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }), // Account where payment was received
    amountReceived: numeric("amount_received").notNull(),
    balanceDueAfterPayment: numeric("balance_due_after_payment"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("cash"),
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
    checkNumber: text("check_number").default(""),
    checkBankName: text("check_bank_name").default(""),
    checkDate: timestamp("check_date").default(sql`NULL`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    paymentsReceivedActiveIndex: index("payments_received_active_idx").on(
      table.isActive
    ),
    paymentsReceivedRefNumberIndex: index(
      "payments_received_ref_number_idx"
    ).on(table.paymentRefNumber),
    paymentsReceivedCustomerIdIndex: index(
      "payments_received_customer_id_idx"
    ).on(table.customerId),
    paymentsReceivedSaleIdIndex: index("payments_received_sale_id_idx").on(
      table.saleId
    ),
    paymentsReceivedIncomeCategoryIdIndex: index(
      "payments_received_income_category_id_idx"
    ).on(table.incomeCategoryId),
    paymentsReceivedReceivingAccountIdIndex: index(
      "payments_received_receiving_account_id_idx"
    ).on(table.receivingAccountId),
  })
);

// Bill Payments (Bill Manager)
export const billPaymentsTable = pgTable(
  "bill_payments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billReferenceNo: text("bill_reference_no").notNull().unique(),
    paymentDate: timestamp("payment_date").notNull(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }), // Foreign key to vendors
    totalPaymentAmount: numeric("total_payment_amount").notNull(), // Sum of all amounts paid from accounts + payment-specific expenses
    generalComments: text("general_comments").default(""),
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
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }), // User who recorded the bill payment
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    billPaymentsActiveIndex: index("bill_payments_active_idx").on(
      table.isActive
    ),
    billPaymentsRefNoIndex: index("bill_payments_ref_no_idx").on(
      table.billReferenceNo
    ),
    billPaymentsVendorIdIndex: index("bill_payments_vendor_id_idx").on(
      table.vendorId
    ),
  })
);

// Junction table for Bill Payments and Purchases
export const billPaymentItemsTable = pgTable(
  "bill_payment_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billPaymentId: uuid("bill_payment_id")
      .notNull()
      .references(() => billPaymentsTable.id, { onDelete: "cascade" }),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchasesTable.id, { onDelete: "cascade" }),
    amountApplied: numeric("amount_applied").notNull(), // How much of this payment went to this specific purchase
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    billPaymentItemsActiveIndex: index("bill_payment_items_active_idx").on(
      table.isActive
    ),
    billPaymentItemsBillPaymentIdIndex: index(
      "bill_payment_items_bill_payment_id_idx"
    ).on(table.billPaymentId),
    billPaymentItemsPurchaseIdIndex: index(
      "bill_payment_items_purchase_id_idx"
    ).on(table.purchaseId),
    billPaymentItemsUnique: unique().on(table.billPaymentId, table.purchaseId), // A payment should only apply once to a purchase
  })
);

// Details for payments made from multiple accounts for a single bill payment
export const billPaymentAccountsTable = pgTable(
  "bill_payment_accounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billPaymentId: uuid("bill_payment_id")
      .notNull()
      .references(() => billPaymentsTable.id, { onDelete: "cascade" }),
    payingAccountId: uuid("paying_account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    amountPaidFromAccount: numeric("amount_paid_from_account").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    billPaymentAccountsActiveIndex: index(
      "bill_payment_accounts_active_idx"
    ).on(table.isActive),
    billPaymentAccountsBillPaymentIdIndex: index(
      "bill_payment_accounts_bill_payment_id_idx"
    ).on(table.billPaymentId),
    billPaymentAccountsPayingAccountIdIndex: index(
      "bill_payment_accounts_paying_account_id_idx"
    ).on(table.payingAccountId),
    // Ensure a single account isn't listed twice for the same payment unless specifically allowed (unlikely)
    billPaymentAccountsUnique: unique().on(
      table.billPaymentId,
      table.payingAccountId
    ),
  })
);

// Accompanying Expenses specifically for a Bill Payment event
export const billPaymentAccompanyingExpensesTable = pgTable(
  "bill_payment_accompanying_expenses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billPaymentId: uuid("bill_payment_id")
      .notNull()
      .references(() => billPaymentsTable.id, { onDelete: "cascade" }),
    accompanyingExpenseTypeId: uuid("accompanying_expense_type_id")
      .notNull()
      .references(() => accompanyingExpenseTypesTable.id, {
        onDelete: "set null",
      }),
    amount: numeric("amount").notNull(),
    payee: text("payee").default(""), // Who received this specific accompanying expense payment
    comments: text("comments").default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    billPaymentAccompanyingExpensesActiveIndex: index(
      "bill_payment_accompanying_expenses_active_idx"
    ).on(table.isActive),
    billPaymentAccompanyingExpensesBillPaymentIdIndex: index(
      "bill_payment_accompanying_expenses_bill_payment_id_idx"
    ).on(table.billPaymentId),
    billPaymentAccompanyingExpensesAccompanyingExpenseTypeIdIndex: index(
      "bill_payment_accompanying_expenses_accompanying_expense_type_id_idx"
    ).on(table.accompanyingExpenseTypeId),
  })
);

// Audit Logs
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    userName: text("user_name"),
    actionType: text("action_type").notNull(),
    tableName: text("table_name").notNull(),
    recordId: uuid("record_id").notNull(),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    auditLogsUserIdIndex: index("audit_logs_user_id_idx").on(table.userId),
    auditLogsTableNameIndex: index("audit_logs_table_name_idx").on(
      table.tableName
    ),
    auditLogsRecordIdIndex: index("audit_logs_record_id_idx").on(
      table.recordId
    ),
    auditLogsActionTypeIndex: index("audit_logs_action_type_idx").on(
      table.actionType
    ),
    auditLogsCreatedAtIndex: index("audit_logs_created_at_idx").on(
      table.createdAt
    ),
  })
);

// Receipts Table
export const receiptsTable = pgTable(
  "receipts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receiptNumber: text("receipt_number").notNull().unique(),
    receiptDate: timestamp("receipt_date").notNull(),
    customerId: uuid("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
    }),
    totalAmountReceived: numeric("total_amount_received").notNull(),
    totalAmountDue: numeric("total_amount_due").notNull(),
    totalBalanceDue: numeric("total_balance_due").notNull(),
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
    receiptsActiveIndex: index("receipts_active_idx").on(table.isActive),
    receiptsNumberIndex: index("receipts_number_idx").on(table.receiptNumber),
    receiptsCustomerIdIndex: index("receipts_customer_id_idx").on(
      table.customerId
    ),
    receiptsReceiptDateIndex: index("receipts_receipt_date_idx").on(
      table.receiptDate
    ),
    receiptsCreatedAtIndex: index("receipts_created_at_idx").on(
      table.createdAt
    ),
  })
);

export const receiptItemsTable = pgTable(
  "receipt_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receiptsTable.id, { onDelete: "cascade" }),
    paymentReceivedId: uuid("payment_received_id")
      .notNull()
      .references(() => paymentsReceivedTable.id, { onDelete: "cascade" }),

    // Item Details
    invoiceNumber: text("invoice_number"),
    invoiceDate: timestamp("invoice_date"),
    amountDue: numeric("amunt_due").notNull(),
    amountReceived: numeric("amount_received").notNull(),
    balanceDue: numeric("balance_due"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),

    // References
    saleId: uuid("sale_id").references(() => salesTable.id, {
      onDelete: "set null",
    }),
    incomeCategoryId: uuid("income_category_id").references(
      () => incomeCategoriesTable.id,
      { onDelete: "set null" }
    ),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    receiptItemsReceiptIdIndex: index("receipt_items_receipt_id_idx").on(
      table.receiptId
    ),
    receiptItemsSaleIdIndex: index("receipt_items_sale_id_idx").on(
      table.saleId
    ),
    receiptItemsActiveIndex: index("receipt_items_active_idx").on(
      table.isActive
    ),
  })
);

// --- Sales Agents Table ---
export const salesAgentsTable = pgTable("sales_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  agentCode: text("agent_code").unique(),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesAgentsRelations = relations(
  salesAgentsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [salesAgentsTable.userId],
      references: [usersTable.id],
    }),
    commissions: many(commissionRecipientsTable),
  })
);

// --- Sales Commissions Table (Main Record) ---
export const commissionsTable = pgTable(
  "commissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commissionRefNumber: text("commission_ref_number").notNull().unique(),
    commissionDate: timestamp("commission_date").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "restrict" }),
    notes: text("notes"),
    totalAmountReceived: numeric("total_amount_received").notNull(),
    totalAdditions: numeric("total_additions").default(0.0).notNull(),
    totalDeductions: numeric("total_deductions").default(0.0).notNull(),
    totalBaseForCommission: numeric("total_base_for_commission").notNull(),
    totalGrossCommission: numeric("total_gross_commission").notNull(),
    totalWithholdingTaxAmount: numeric(
      "total_withholding_tax_amount"
    ).notNull(),
    totalCommissionPayable: numeric("total_commission_payable").notNull(),

    status: commissionStatusEnum("status")
      .default("pending_approval")
      .notNull(),
    paymentStatus: commissionPaymentStatusEnum("payment_status")
      .default("pending")
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    commissionsActiveIndex: index("commissions_active_idx").on(table.isActive),
    commissionsCustomerIdIndex: index("commissions_customer_id_idx").on(
      table.customerId
    ),
    commissionsCommissionDateIndex: index("commissions_commission_date_idx").on(
      table.commissionDate
    ),
    commissionsStatusIndex: index("commissions_status_idx").on(table.status),
    commissionsPaymentStatusIndex: index("commissions_payment_status_idx").on(
      table.paymentStatus
    ),
  })
);

export const commissionsRelations = relations(
  commissionsTable,
  ({ one, many }) => ({
    customer: one(customersTable, {
      fields: [commissionsTable.customerId],
      references: [customersTable.id],
    }),
    recipients: many(commissionRecipientsTable),
    commissionSales: many(commissionSalesTable),
  })
);

// --- Commission Sales Junction Table ---
export const commissionSalesTable = pgTable(
  "commission_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissionsTable.id, { onDelete: "cascade" }),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => salesTable.id, { onDelete: "restrict" }),
    amountReceived: numeric("amount_received").notNull(),
    additions: numeric("additions").default(0.0).notNull(),
    deductions: numeric("deductions").default(0.0).notNull(),
    commissionRate: numeric("commission_rate").notNull(),
    withholdingTaxRate: numeric("withholding_tax_rate"),
    withholdingTaxId: uuid("withholding_tax_id").references(
      () => taxRatesTable.id,
      {
        onDelete: "set null",
      }
    ),
    withholdingTaxAmount: numeric("withholding_tax_amount").notNull(),
    baseForCommission: numeric("base_for_commission").notNull(),
    grossCommission: numeric("gross_commission").notNull(),
    commissionPayable: numeric("commission_payable").notNull(),

    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    commissionSalesCommissionIdIndex: index(
      "commission_sales_commission_id_idx"
    ).on(table.commissionId),
    commissionSalesSaleIdIndex: index("commission_sales_sale_id_idx").on(
      table.saleId
    ),
    // Ensure a sale can only be in one commission at a time
    commissionSalesSaleIdUnique: unique("commission_sales_sale_id_unique").on(
      table.saleId
    ),
  })
);

export const commissionSalesRelations = relations(
  commissionSalesTable,
  ({ one }) => ({
    commission: one(commissionsTable, {
      fields: [commissionSalesTable.commissionId],
      references: [commissionsTable.id],
    }),
    sale: one(salesTable, {
      fields: [commissionSalesTable.saleId],
      references: [salesTable.id],
    }),
    withholdingTax: one(taxRatesTable, {
      fields: [commissionSalesTable.withholdingTaxId],
      references: [taxRatesTable.id],
    }),
  })
);

// --- Commission Recipients Table ---
export const commissionRecipientsTable = pgTable("commission_recipients", {
  id: uuid("id").defaultRandom().primaryKey(),
  commissionId: uuid("commission_id")
    .notNull()
    .references(() => commissionsTable.id, { onDelete: "cascade" }),
  salesAgentId: uuid("sales_agent_id")
    .notNull()
    .references(() => salesAgentsTable.id),
  amount: numeric("amount").notNull(),
  paymentStatus: commissionPaymentStatusEnum("payment_status")
    .default("pending")
    .notNull(),
  notes: text("notes"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissionRecipientsRelations = relations(
  commissionRecipientsTable,
  ({ one, many }) => ({
    commission: one(commissionsTable, {
      fields: [commissionRecipientsTable.commissionId],
      references: [commissionsTable.id],
    }),
    salesAgent: one(salesAgentsTable, {
      fields: [commissionRecipientsTable.salesAgentId],
      references: [salesAgentsTable.id],
    }),
    payouts: many(commissionPayoutsTable),
  })
);

export const commissionPayoutsTable = pgTable(
  "commission_payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payoutRefNumber: text("payout_ref_number").notNull().unique(),
    commissionRecipientId: uuid("commission_recipient_id")
      .notNull()
      .references(() => commissionRecipientsTable.id, { onDelete: "restrict" }),
    payingAccountId: uuid("paying_account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "restrict" }),
    expenseCategoryId: uuid("expense_category_id")
      .notNull()
      .references(() => expenseCategoriesTable.id, { onDelete: "restrict" }),
    amount: numeric("amount").notNull(),
    payoutDate: timestamp("payout_date").notNull(),
    notes: text("notes"),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),

    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    payoutsCommissionRecipientIdIndex: index(
      "payouts_commission_recipient_id_idx"
    ).on(table.commissionRecipientId),
    payoutsPayingAccountIdIndex: index("payouts_paying_account_id_idx").on(
      table.payingAccountId
    ),
    payoutsExpenseCategoryIdIndex: index("payouts_expense_category_id_idx").on(
      table.expenseCategoryId
    ),
    payoutsUserIdIndex: index("payouts_user_id_idx").on(table.userId),
    payoutsPayoutDateIndex: index("payouts_payout_date_idx").on(
      table.payoutDate
    ),
  })
);

export const commissionPayoutsRelations = relations(
  commissionPayoutsTable,
  ({ one }) => ({
    commissionRecipient: one(commissionRecipientsTable, {
      fields: [commissionPayoutsTable.commissionRecipientId],
      references: [commissionRecipientsTable.id],
    }),
    payingAccount: one(accountsTable, {
      fields: [commissionPayoutsTable.payingAccountId],
      references: [accountsTable.id],
    }),
    expenseCategory: one(expenseCategoriesTable, {
      fields: [commissionPayoutsTable.expenseCategoryId],
      references: [expenseCategoriesTable.id],
    }),
    user: one(usersTable, {
      fields: [commissionPayoutsTable.userId],
      references: [usersTable.id],
    }),
  })
);
