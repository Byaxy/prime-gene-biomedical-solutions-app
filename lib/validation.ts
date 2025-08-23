import {
  CarrierType,
  DeliveryStatus,
  PackageType,
  PaymentMethod,
  PaymentStatus,
  PurchaseStatus,
  QuotationStatus,
  SaleStatus,
  ShipmentStatus,
  ShipperType,
  ShippingMode,
  WaybillType,
} from "@/types";
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
  quantity: z.number().int().min(0, "Quantity must be 0 or more"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  sellingPrice: z.number().min(0, "Selling price must be positive"),
  alertQuantity: z.number().int().min(1, "Min reoder level must be 1 or more"),
  maxAlertQuantity: z
    .number()
    .int()
    .min(1, "Max reoder level must be 1 or more"),
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

// Purchase Orders
export const PurchaseOrderFormValidation = z.object({
  purchaseOrderNumber: z.string().nonempty("Purchase order number is required"),
  purchaseOrderDate: z.date().refine((date) => date <= new Date(), {
    message: "Purchase order date cannot be in the future",
  }),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  vendorId: z.string().nonempty("Vendor is required"),
  status: z
    .enum(Object.values(PurchaseStatus) as [string, ...string[]])
    .default(PurchaseStatus.Pending),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        productId: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(1, "Quantity must be more than 0"),
        costPrice: z.number().min(0, "Cost price must be 0 or more"),
        totalPrice: z.number().min(0, "Total price must be 0 or more"),
        productName: z.string(),
        productID: z.string(),
      })
    )
    .min(1, "At least one product is required"),

  selectedProductId: z.string().optional(),
});
export type PurchaseOrderFormValues = z.infer<
  typeof PurchaseOrderFormValidation
>;

// Purchases
export const PurchaseFormValidation = z.object({
  purchaseNumber: z.string().nonempty("Purchase number is required"),
  vendorInvoiceNumber: z.string().nonempty("Vendor invoice number is required"),
  purchaseDate: z.date().refine((date) => date <= new Date(), {
    message: "Purchase date cannot be in the future",
  }),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  amountPaid: z.number().min(0, "Amount paid must be 0 or more"),
  vendorId: z.string().nonempty("Vendor is required"),
  purchaseOrderId: z.string().optional(),
  status: z
    .enum(Object.values(PurchaseStatus) as [string, ...string[]])
    .default(PurchaseStatus.Pending),
  notes: z.string().optional(),
  attachments: z.any().optional(),
  products: z
    .array(
      z.object({
        productId: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(1, "Quantity must be more than 0"),
        costPrice: z.number().min(0, "Cost price must be 0 or more"),
        totalPrice: z.number().min(0, "Total price must be 0 or more"),
        quantityReceived: z
          .number()
          .int()
          .min(0, "Quantity received must be 0 or more")
          .default(0),
        productName: z.string(),
        productID: z.string(),
      })
    )
    .min(1, "At least one product is required"),

  selectedProductId: z.string().optional(),
});
export type PurchaseFormValues = z.infer<typeof PurchaseFormValidation>;

// Recieving Purchase Orders
export const ReceivingPurchaseFormValidation = z.object({
  purchaseId: z.string().nonempty("Purchase order is required"),
  purchaseNumber: z.string().nonempty("Purchase number is required"),
  vendorInvoiceNumber: z.string().nonempty("Vendor invoice number is required"),
  vendorId: z.string().nonempty("Vendor is required"),
  storeId: z.string().nonempty("Store is required"),
  vendorParkingListNumber: z
    .string()
    .nonempty("Vendor parking list number is required"),
  receivingDate: z.date().refine((date) => date <= new Date(), {
    message: "Receiving date cannot be in the future",
  }),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  notes: z.string().optional(),
  attachments: z.any().optional(),
  products: z
    .array(
      z.object({
        purchaseItemId: z.string().nonempty("Purchase item is required"),
        productId: z.string().nonempty("Product is required"),
        inventoryStock: z
          .array(
            z.object({
              lotNumber: z.string().nonempty("Lot number is required"),
              quantity: z.number().int().min(1, "Quantity must be more than 0"),
              manufactureDate: z.date().optional(),
              expiryDate: z.date().optional(),
            })
          )
          .min(1, "At least one inventory stock is required"),
        costPrice: z.number().min(0, "Cost price must be 0 or more"),
        sellingPrice: z.number().min(0, "Selling price must be 0 or more"),
        totalCost: z.number().min(0, "Total cost must be 0 or more"),
        pendingQuantity: z
          .number()
          .int()
          .min(0, "Quantity pending must be 0 or more"),
        productName: z.string(),
        productID: z.string(),
      })
    )
    .min(1, "At least one product is required"),
});

export type ReceivingPurchaseFormValues = z.infer<
  typeof ReceivingPurchaseFormValidation
>;

export const ReceivedInventoryStockValidation = z
  .object({
    inventoryStock: z
      .array(
        z.object({
          lotNumber: z.string().nonempty("Lot number is required"),
          quantity: z.number().int().min(1, "Quantity must be more than 0"),
          manufactureDate: z.date().optional(),
          expiryDate: z.date().optional(),
        })
      )
      .min(1, "At least one inventory stock is required"),
    totalCost: z.number().min(0, "Total cost must be 0 or more"),
  })
  .superRefine((data, ctx) => {
    const lotNumberMap = new Map<string, number[]>();

    data.inventoryStock.forEach((item, index) => {
      const lotNumber = item.lotNumber?.trim();

      if (lotNumber) {
        if (!lotNumberMap.has(lotNumber)) {
          lotNumberMap.set(lotNumber, []);
        }
        lotNumberMap.get(lotNumber)!.push(index);
      }
    });

    lotNumberMap.forEach((indices, lotNumber) => {
      if (indices.length > 1) {
        // Add error to each duplicate row
        indices.forEach((index) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate lot number "${lotNumber}" found`,
            path: ["inventoryStock", index, "lotNumber"],
          });
        });
      }
    });
  });
export type ReceivedInventoryStockValues = z.infer<
  typeof ReceivedInventoryStockValidation
>;

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
  address: z.object({
    addressName: z.string().nonempty("Address Name is required"),
    address: z.string().nonempty("Address is required"),
    city: z.string().nonempty("City is required"),
    state: z.string().nonempty("State is required"),
    country: z.string().nonempty("Country is required"),
  }),
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
export const SaleFormValidation = z
  .object({
    invoiceNumber: z.string().nonempty("Invoice number is required"),
    saleDate: z.date().refine((date) => date <= new Date(), {
      message: "Sale date cannot be in the future",
    }),
    customerId: z.string().nonempty("Customer is required"),
    storeId: z.string().nonempty("Store is required"),
    totalAmount: z.number().min(0, "Total amount must be 0 or more"),
    subTotal: z.number().min(0, "Sub total must be 0 or more"),
    totalTaxAmount: z.number().min(0, "Tax amount must be 0 or more"),
    discountAmount: z.number().min(0, "Discount amount must be 0 or more"),
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
    notes: z.string().optional(),
    quotationId: z.string().optional(),
    attachments: z.any().optional(),
    isDeliveryAddressAdded: z.boolean().default(false),
    deliveryAddress: z
      .object({
        addressName: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    products: z
      .array(
        z.object({
          inventoryStock: z.array(
            z.object({
              inventoryStockId: z
                .string()
                .nonempty("Inventory Stock is required"),
              lotNumber: z.string().nonempty("Lot number is required"),
              quantityToTake: z.number().min(1, "Quantity must be at least 1"),
            })
          ),
          hasBackorder: z.boolean().default(false),
          backorderQuantity: z.number().int().optional(),
          productId: z.string().nonempty("Product is required"),
          quantity: z.number().int().min(1, "Quantity must be 1 or more"),
          unitPrice: z.number().min(0, "Unit price must be 0 or more"),
          totalPrice: z.number().min(0, "Total price must be 0 or more"),
          subTotal: z.number().min(0, "Sub total must be 0 or more"),
          taxAmount: z.number().min(0, "Tax amount must be 0 or more"),
          taxRate: z.number().min(0, "Tax rate must be 0 or more"),
          taxRateId: z.string().nonempty("Tax rate is required"),
          discountAmount: z
            .number()
            .min(0, "Discount amount must be 0 or more"),
          discountRate: z.number().min(0, "Discount rate must be 0 or more"),
          productName: z.string(),
          productID: z.string(),
        })
      )
      .min(1, "At least one product is required"),

    // Temporary fields for product selection
    selectedProductId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isDeliveryAddressAdded) {
      if (!data.deliveryAddress?.addressName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address name is required",
          path: ["deliveryAddress", "addressName"],
        });
      }
      if (!data.deliveryAddress?.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address is required",
          path: ["deliveryAddress", "address"],
        });
      }
      if (!data.deliveryAddress?.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required",
          path: ["deliveryAddress", "city"],
        });
      }
      if (!data.deliveryAddress?.state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "State is required",
          path: ["deliveryAddress", "state"],
        });
      }
      if (!data.deliveryAddress?.country) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required",
          path: ["deliveryAddress", "country"],
        });
      }
      if (!data.deliveryAddress?.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone is required",
          path: ["deliveryAddress", "phone"],
        });
      }
    }

    // Validate that the every product inventoryStock total quantity is equal to the requested quantity
    if (data.products.length > 0) {
      data.products.forEach((product, index) => {
        const totalInventoryStockQuantity = (
          product.inventoryStock ?? []
        ).reduce((total, stock) => total + (stock.quantityToTake || 0), 0);

        if (
          totalInventoryStockQuantity + (product.backorderQuantity ?? 0) !==
          product.quantity
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total allocated quantity must match requested quantity",
            path: ["products", index, "inventoryStock"],
          });
        }
        if (
          product.hasBackorder &&
          (product.backorderQuantity === undefined ||
            product.backorderQuantity <= 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Backorder quantity must be more than zero",
            path: ["products", index, "inventoryStock"],
          });
        }
      });
    }
  });
export type SaleFormValues = z.infer<typeof SaleFormValidation>;

export const InventoryStockAllocationValidation = z
  .object({
    inventoryStock: z
      .array(
        z.object({
          inventoryStockId: z.string().min(1, "Stock ID is required"),
          lotNumber: z.string().default(""),
          quantityToTake: z.number().min(1, "Quantity must be at least 1"),
        })
      )
      .min(1, "At least one stock allocation is required")
      .superRefine((items, ctx) => {
        // Check for duplicate inventory stock IDs (excluding backorders)
        const stockIds = items
          .filter((item) => item.inventoryStockId !== "BACKORDER")
          .map((item) => item.inventoryStockId);

        const duplicates = stockIds.filter(
          (id, index) => stockIds.indexOf(id) !== index
        );

        if (duplicates.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate stock allocations are not allowed",
            path: [],
          });
        }
      }),
    includeBackorder: z.boolean().default(true),
    searchQuery: z.string().default(""),
    // Additional validation fields for business logic
    requiredQuantity: z
      .number()
      .min(1, "Required quantity must be at least 1")
      .optional(),
    totalAvailable: z
      .number()
      .min(0, "Total available must be 0 or more")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validate total allocation doesn't exceed required quantity
    if (data.requiredQuantity) {
      const totalAllocated = data.inventoryStock.reduce(
        (sum, item) => sum + item.quantityToTake,
        0
      );

      if (totalAllocated > data.requiredQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total allocation (${totalAllocated}) exceeds required quantity (${data.requiredQuantity})`,
          path: ["inventoryStock"],
        });
      }

      // Warn if allocation is less than required and no backorder
      if (totalAllocated < data.requiredQuantity && !data.includeBackorder) {
        const hasBackorder = data.inventoryStock.some(
          (item) => item.inventoryStockId === "BACKORDER"
        );

        if (!hasBackorder) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Allocation (${totalAllocated}) is less than required (${data.requiredQuantity}). Enable backorder or increase allocation.`,
            path: ["inventoryStock"],
          });
        }
      }
    }
  });

export type InventoryStockAllocationFormValues = z.infer<
  typeof InventoryStockAllocationValidation
>;

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
export const QuotationFormValidation = z
  .object({
    quotationNumber: z.string().nonempty("Quotation number is required"),
    rfqNumber: z.string().nonempty("Request for quotation number is required"),
    isDeliveryAddressAdded: z.boolean().default(false),
    quotationDate: z.date().refine((date) => date <= new Date(), {
      message: "Quotation date cannot be in the future",
    }),
    customerId: z.string().nonempty("Customer is required"),
    totalAmount: z.number().min(0, "Total amount must be 0 or more"),
    subTotal: z.number().min(0, "Sub total must be 0 or more"),
    totalTaxAmount: z.number().min(0, "Tax amount must be 0 or more"),
    discountAmount: z.number().min(0, "Discount amount must be 0 or more"),
    status: z
      .enum(Object.values(QuotationStatus) as [string, ...string[]])
      .default(QuotationStatus.Pending),
    notes: z.string().optional(),
    convertedToSale: z.boolean().default(false),
    products: z
      .array(
        z.object({
          productId: z.string().nonempty("Product is required"),
          quantity: z.number().int().min(1, "Quantity must be 1 or more"),
          unitPrice: z.number().min(0, "Unit price must be 0 or more"),
          totalPrice: z.number().min(0, "Total price must be 0 or more"),
          subTotal: z.number().min(0, "Sub total must be 0 or more"),
          taxAmount: z.number().min(0, "Tax amount must be 0 or more"),
          taxRate: z.number().min(0, "Tax rate must be 0 or more"),
          taxRateId: z.string().nonempty("Tax rate is required"),
          discountAmount: z
            .number()
            .min(0, "Discount amount must be 0 or more"),
          discountRate: z.number().min(0, "Discount rate must be 0 or more"),
          productName: z.string(),
          productID: z.string(),
        })
      )
      .min(1, "At least one product is required"),
    attachments: z.any().optional(),
    deliveryAddress: z
      .object({
        addressName: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),

    // Temporary fields for product selection
    selectedProductId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isDeliveryAddressAdded) {
      if (!data.deliveryAddress?.addressName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address name is required",
          path: ["deliveryAddress", "addressName"],
        });
      }
      if (!data.deliveryAddress?.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address is required",
          path: ["deliveryAddress", "address"],
        });
      }
      if (!data.deliveryAddress?.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required",
          path: ["deliveryAddress", "city"],
        });
      }
      if (!data.deliveryAddress?.state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "State is required",
          path: ["deliveryAddress", "state"],
        });
      }
      if (!data.deliveryAddress?.country) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required",
          path: ["deliveryAddress", "country"],
        });
      }
      if (!data.deliveryAddress?.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone is required",
          path: ["deliveryAddress", "phone"],
        });
      }
    }
  });
export type QuotationFormValues = z.infer<typeof QuotationFormValidation>;

// Stores
export const StoreFormValidation = z.object({
  name: z.string().nonempty("Name is required"),
  location: z.string().nonempty("Location is required"),
});
export type StoreFormValues = z.infer<typeof StoreFormValidation>;

// New Stock Adjustments
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

// Existing Stock Adjustments
export const ExistingStockAdjustmentFormValidation = z.object({
  storeId: z.string().nonempty("Store is required"),
  receivedDate: z.date().refine((date) => date <= new Date(), {
    message: "Received date cannot be in the future",
  }),
  notes: z.string().optional(),
  entries: z
    .array(
      z.object({
        inventoryStockId: z.string().nonempty("Inventory stock is required"),
        currentQuantity: z.number().int().min(0, "Quantity must be at least 0"),
        lotNumber: z.string().nonempty("Lot number is required"),
        costPrice: z.number().optional(),
        sellingPrice: z.number().optional(),
        manufactureDate: z.date().optional(),
        expiryDate: z.date().optional(),
        productName: z.string().optional(),
        productID: z.string().optional(),
        adjustmentQuantity: z
          .number()
          .min(0, "Adjustment quantity must be greater than 0"),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).default("ADD"),
      })
    )
    .min(1, "At least one inventory stock is required"),
  selectedInventoryStockId: z.string().optional(),
});
export type ExistingStockAdjustmentFormValues = z.infer<
  typeof ExistingStockAdjustmentFormValidation
>;

// Product Bulck Upload
export const BulkProductValidation = z.array(
  ProductFormValidation.omit({ image: true }).extend({
    id: z.string().optional(),
  })
);
export type BulkProductValues = z.infer<typeof BulkProductValidation>;

// Deliveries
export const DeliveryFormValidation = z
  .object({
    deliveryDate: z.date(),
    deliveryRefNumber: z
      .string()
      .nonempty("Delivery refference number is required"),
    status: z
      .enum(Object.values(DeliveryStatus) as [string, ...string[]])
      .default(QuotationStatus.Pending),
    deliveryAddress: z.object({
      addressName: z.string().nonempty("Address Name is required"),
      address: z.string().nonempty("Address is required"),
      city: z.string().nonempty("City is required"),
      state: z.string().nonempty("State is required"),
      country: z.string().nonempty("Country is required"),
      email: z.string().optional(),
      phone: z.string().nonempty("Phone number is required"),
    }),
    customerId: z.string().nonempty("Customer is required"),
    storeId: z.string().nonempty("Store is required"),
    saleId: z.string().nonempty("Sale is required"),
    notes: z.string().optional(),
    deliveredBy: z.string().optional(),
    receivedBy: z.string().optional(),
    products: z
      .array(
        z.object({
          productId: z.string().nonempty("Product is required"),
          quantityRequested: z
            .number()
            .int()
            .min(1, "Quantity must be 1 or more"),
          quantitySupplied: z
            .number()
            .int()
            .min(0, "Quantity supplied must be 0 or more"),
          balanceLeft: z
            .number()
            .int()
            .min(0, "Balance left must be 0 or more"),
          productName: z.string(),
          productID: z.string(),
        })
      )
      .min(1, "At least one product is required"),
  })
  .superRefine((data, ctx) => {
    if (data.products.length > 0) {
      data.products.forEach((product, index) => {
        if (product.quantitySupplied > product.quantityRequested) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Quantity supplied cannot be more than quantity requested",
            path: ["products", index, "quantitySupplied"],
          });
        }
      });
    }
  });

export type DeliveryFormValues = z.infer<typeof DeliveryFormValidation>;

// Waybills
export const WaybillFormValidation = z
  .object({
    waybillRefNumber: z
      .string()
      .nonempty("Waybill refference number is required"),
    waybillDate: z.date(),
    status: z
      .enum(Object.values(DeliveryStatus) as [string, ...string[]])
      .default(QuotationStatus.Pending),
    deliveryAddress: z.object({
      addressName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }),
    customerId: z.string().nonempty("Customer is required"),
    storeId: z.string().nonempty("Store is required"),
    saleId: z.string(),
    notes: z.string().optional(),
    deliveredBy: z.string().optional(),
    receivedBy: z.string().optional(),
    products: z
      .array(
        z.object({
          productId: z.string().nonempty("Product is required"),
          saleItemId: z.string(),
          inventoryStock: z
            .array(
              z.object({
                inventoryStockId: z
                  .string()
                  .nonempty("Inventory Stock is required"),
                lotNumber: z.string().nonempty("Lot number is required"),
                quantityTaken: z.number().min(1, "Quantity must be at least 1"),
                unitPrice: z.number().min(0, "Unit price must be 0 or more"),
              })
            )
            .min(1, "At least one inventory stock is required"),
          quantityRequested: z
            .number()
            .int()
            .min(1, "Quantity must be 1 or more"),
          quantitySupplied: z
            .number()
            .int()
            .min(0, "Quantity supplied must be 0 or more"),
          balanceLeft: z
            .number()
            .int()
            .min(0, "Balance left must be 0 or more"),
          fulfilledQuantity: z
            .number()
            .int()
            .min(0, "Quantity supplied must be 0 or more"),
          quantityConverted: z
            .number()
            .int()
            .min(0, "Quantity converted must be 0 or more"),
          productName: z.string(),
          productID: z.string(),
        })
      )
      .min(1, "At least one product is required"),

    isConverted: z.boolean().default(false),
    isLoanWaybill: z.boolean().default(false),
    selectedProductId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.products.length > 0) {
      data.products.forEach((product, index) => {
        if (
          product.quantitySupplied >
            product.quantityRequested - product.fulfilledQuantity &&
          !data.isLoanWaybill
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Quantity supplied cannot be more than quantity required",
            path: ["products", index, "quantitySupplied"],
          });
        }

        if (
          data.isLoanWaybill &&
          product.quantitySupplied !== product.quantityRequested
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total allocated quantity must match supplied quantity",
            path: ["products", index, "inventoryStock"],
          });
        }

        const totalInventoryStockQuantity = (
          product.inventoryStock ?? []
        ).reduce((total, stock) => total + (stock.quantityTaken || 0), 0);

        if (totalInventoryStockQuantity !== product.quantitySupplied) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total allocated quantity must match supplied quantity",
            path: ["products", index, "inventoryStock"],
          });
        }
      });
    }
  });
export type WaybillFormValues = z.infer<typeof WaybillFormValidation>;

export const WaybillInventoryStockAllocationValidation = z
  .object({
    inventoryStock: z
      .array(
        z.object({
          inventoryStockId: z.string().nonempty("Inventory Stock is required"),
          lotNumber: z.string().nonempty("Lot number is required"),
          quantityTaken: z.number().min(1, "Quantity must be at least 1"),
          unitPrice: z.number().min(0, "Unit price must be 0 or more"),
        })
      )
      .min(1, "At least one stock allocation is required")
      .superRefine((items, ctx) => {
        const stockIds = items.map((item) => item.inventoryStockId);

        const duplicates = stockIds.filter(
          (id, index) => stockIds.indexOf(id) !== index
        );

        if (duplicates.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate stock allocations are not allowed",
            path: ["inventoryStock"],
          });
        }
      }),
    searchQuery: z.string().default(""),
    // Additional validation fields for business logic
    requiredQuantity: z
      .number()
      .min(1, "Required quantity must be at least 1")
      .optional(),
    totalAvailable: z
      .number()
      .min(0, "Total available must be 0 or more")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validate total allocation doesn't exceed required quantity
    if (data.requiredQuantity) {
      const totalAllocated = data.inventoryStock.reduce(
        (sum, item) => sum + item.quantityTaken,
        0
      );

      if (totalAllocated > data.requiredQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total allocation (${totalAllocated}) exceeds required quantity (${data.requiredQuantity})`,
          path: ["inventoryStock"],
        });
      }
    }
  });

export type WaybillInventoryStockAllocationFormValues = z.infer<
  typeof WaybillInventoryStockAllocationValidation
>;

export const ConvertLoanWaybillFormValidation = z
  .object({
    waybillRefNumber: z
      .string()
      .nonempty("Waybill refference number is required"),
    waybillType: z
      .enum(Object.values(WaybillType) as [string, ...string[]])
      .default(WaybillType.Loan),
    customerId: z.string().nonempty("Customer is required"),
    storeId: z.string().nonempty("Store is required"),
    saleId: z.string().nonempty("Sale is required"),
    products: z
      .array(
        z.object({
          waybillItemId: z.string().nonempty("Waybill item ID is required"),
          productId: z.string().nonempty("Product is required"),
          saleItemId: z.string().nonempty("Sale item ID is required"),
          quantityRequested: z
            .number()
            .int()
            .min(1, "Quantity must be 1 or more"),
          quantitySupplied: z
            .number()
            .int()
            .min(0, "Quantity supplied must be 0 or more"),
          balanceLeft: z
            .number()
            .int()
            .min(0, "Balance left must be 0 or more"),
          fulfilledQuantity: z
            .number()
            .int()
            .min(0, "Quantity supplied must be 0 or more"),
          quantityConverted: z
            .number()
            .int()
            .min(0, "Quantity converted must be 0 or more"),
          quantityToConvert: z
            .number()
            .int()
            .min(1, "Quantity converted must be more than 0"),
          maxConvertibleQuantity: z
            .number()
            .int()
            .min(1, "Quantity converted must be more than 0"),
          productName: z.string(),
          productID: z.string(),
        })
      )
      .min(1, "At least one product is required"),

    conversionDate: z.date().refine((date) => date <= new Date(), {
      message: "Conversion date cannot be in the future",
    }),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.products.length > 0) {
      data.products.forEach((product, index) => {
        if (product.quantityToConvert > product.maxConvertibleQuantity) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Quantity to convert cannot exceed the maximum convertible quantity",
            path: ["products", index, "quantityToConvert"],
          });
        }
      });
    }
  });
export type ConvertLoanWaybillFormValues = z.infer<
  typeof ConvertLoanWaybillFormValidation
>;

export const PromissoryNoteFormValidation = z.object({
  customerId: z.string().nonempty("Customer is required"),
  saleId: z.string().nonempty("Sale is required"),
  promissoryNoteRefNumber: z
    .string()
    .nonempty("Promissory note refference number is required"),
  promissoryNoteDate: z.date().refine((date) => date <= new Date(), {
    message: "Promissory note date cannot be in the future",
  }),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  notes: z.string().optional(),
  products: z
    .array(
      z.object({
        saleItemId: z.string().nonempty("Sale item ID is required"),
        productId: z.string().nonempty("Product is required"),
        quantity: z.number().int().min(1, "Quantity must be 1 or more"),
        unitPrice: z.number().min(0, "Unit price must be 0 or more"),
        subTotal: z.number().min(0, "Subtotal must be 0 or more"),
        productName: z.string(),
        productID: z.string(),
      })
    )
    .min(1, "At least one product is required"),
});

export type PromissoryNoteFormValues = z.infer<
  typeof PromissoryNoteFormValidation
>;

// Schema for individual item within a parcel
const PercelItemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().nonempty("Product name is required"),
  productID: z.string().nonempty("Product ID is required"),
  productUnit: z.string().nonempty("Product unit is required"),
  quantity: z.number().int().min(1, "Quantity must be more than 0"),
  isPurchaseItem: z.boolean(),
  purchaseReference: z.string().optional(),
  netWeight: z.number().min(0.001, "Net weight must be greater than 0"),
});

// Schema for a single parcel/package
const ParcelSchema = z.object({
  parcelNumber: z.string().min(1, "Package number is required"),
  packageType: z.nativeEnum(PackageType, {
    errorMap: () => ({ message: "Package type is required" }),
  }),
  length: z.number().min(0.1, "Length must be greater than 0"),
  width: z.number().min(0.1, "Width must be greater than 0"),
  height: z.number().min(0.1, "Height must be greater than 0"),
  netWeight: z.number().min(0.001, "Net weight must be greater than 0"),
  grossWeight: z.number().min(0.001, "Gross weight must be greater than 0"),
  volumetricWeight: z.number(),
  chargeableWeight: z.number(),
  volumetricDivisor: z
    .number()
    .int()
    .min(1000, "Volumetric divisor must be at least 1000"),
  description: z.string().optional(),
  items: z
    .array(PercelItemSchema)
    .min(1, "At least one item is required in a package"),
  unitPricePerKg: z.number().min(0, "Unit price per kg must be 0 or more"),
  totalAmount: z.number().min(0, "Total amount must be 0 or more"),
  totalItems: z.number().int().min(1, "Total items must be at least 1"),
});

// Main shipment validation schema
export const ShipmentFormValidation = z
  .object({
    shipmentRefNumber: z.string().min(1, "Shipment number is required"),
    numberOfPackages: z
      .number()
      .int()
      .min(0, "Number of packages cannot be negative"),
    totalItems: z.number().int().min(0, "Number of items cannot be negative"),

    shippingMode: z.nativeEnum(ShippingMode, {
      errorMap: () => ({ message: "Shipping mode is required" }),
    }),
    shipperType: z.nativeEnum(ShipperType, {
      errorMap: () => ({ message: "Shipped by field is required" }),
    }),
    carrierType: z.nativeEnum(CarrierType, {
      errorMap: () => ({ message: "Carrier type is required" }),
    }),
    carrierName: z.string().min(1, "Carrier name is required"),
    trackingNumber: z.string().nonempty("Tracking number is required"),
    shippingVendorId: z.string().optional(),
    shipperName: z.string().optional(),
    shipperAddress: z.string().optional(),
    shippingDate: z.date().refine((date) => date <= new Date(), {
      message: "Shipping date cannot be in the future",
    }),
    dateShipped: z.date().nullable().optional(),
    estimatedArrivalDate: z.date().nullable().optional(),
    actualArrivalDate: z.date().nullable().optional(),

    totalAmount: z.number().min(0, "Total amount cannot be negative"),
    status: z.nativeEnum(ShipmentStatus, {
      errorMap: () => ({ message: "Shipment status is required" }),
    }),

    vendorIds: z
      .array(z.string())
      .min(1, "At least one vendor must be selected"),
    purchaseIds: z
      .array(z.string())
      .min(1, "At least one purchase order must be selected"),

    originPort: z.string().optional().or(z.literal("")),
    destinationPort: z.string().optional().or(z.literal("")),
    containerNumber: z.string().optional().or(z.literal("")),
    flightNumber: z.string().optional().or(z.literal("")),

    notes: z.string().optional().or(z.literal("")),
    attachments: z.any().optional(),
    parcels: z
      .array(ParcelSchema)
      .min(1, "At least one package (parcel) must be added to the shipment"),

    // temporary fields
    tempParcelNumber: z.string().optional(),
    tempPackageType: z.nativeEnum(PackageType).default(PackageType.Box),
    tempLength: z.number().optional(),
    tempWidth: z.number().optional(),
    tempHeight: z.number().optional(),
    tempNetWeight: z.number().optional(),
    tempGrossWeight: z.number().optional(),
    tempVolumetricDivisor: z.number().optional(),
    tempDescription: z.string().optional(),
    tempUnitPricePerKg: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.shipperType === ShipperType.Vendor && !data.shippingVendorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shipping vendor is required",
        path: ["shippingVendorId"],
      });
    }
    if (data.shipperType === ShipperType.Courier && !data.shipperName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shipper name is required",
        path: ["shipperName"],
      });
    }

    if (data.shipperType === ShipperType.Courier && !data.shipperAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shipper address is required",
        path: ["shipperAddress"],
      });
    }
    // Validate shipping method specific fields and their carrier types
    if (data.shippingMode === ShippingMode.Air) {
      if (!data.originPort) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origin Airport is required for air shipments",
          path: ["originPort"],
        });
      }
      if (!data.destinationPort) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination Airport is required for air shipments",
          path: ["destinationPort"],
        });
      }
      if (!data.flightNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flight number is required for air shipments",
          path: ["flightNumber"],
        });
      }
    } else if (data.shippingMode === ShippingMode.Sea) {
      if (!data.originPort) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origin Port is required for sea shipments",
          path: ["originPort"],
        });
      }
      if (!data.destinationPort) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination Port is required for sea shipments",
          path: ["destinationPort"],
        });
      }
      if (!data.containerNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Container number is required for sea shipments",
          path: ["containerNumber"],
        });
      }
      // Ensure carrier type is valid for Sea
      if (data.carrierType !== CarrierType.SeaCargo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid carrier type for Sea Freight",
          path: ["carrierType"],
        });
      }
    } else if (data.shippingMode === ShippingMode.Express) {
      if (!data.originPort) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origin Airport is required for air shipments",
          path: ["originPort"],
        });
      }
      if (!data.destinationPort) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination Airport is required for air shipments",
          path: ["destinationPort"],
        });
      }
      if (!data.flightNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flight number is required for air shipments",
          path: ["flightNumber"],
        });
      }
    }
  });

export type ShipmentFormValues = z.infer<typeof ShipmentFormValidation>;
