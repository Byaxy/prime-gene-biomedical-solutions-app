import {
  AccountType,
  CarrierType,
  ChartOfAccountType,
  CommissionPaymentStatus,
  CommissionStatus,
  DateRange,
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
import { calculateCommissionAmounts } from "./utils";

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
    roleId: z.string().nonempty("Role is required"),
    image: z.any().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const EditUserValidation = z.object({
  name: z.string().nonempty("Name is required"),
  roleId: z.string().nonempty("Role is required"),
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
  costPrice: z.number().min(0, "Cost price must be positive"),
  sellingPrice: z.number().min(0, "Selling price must be positive"),
  alertQuantity: z.number().int().min(1, "Min reoder level must be 1 or more"),
  maxAlertQuantity: z
    .number()
    .int()
    .min(1, "Max reoder level must be 1 or more"),
  categoryId: z.string().nonempty("Category is required"),
  typeId: z.string().optional(),
  brandId: z.string().nonempty("Brand is required"),
  unitId: z.string().nonempty("Unit is required"),
  image: z.any().optional(),
});
export type ProductFormValues = z.infer<typeof ProductFormValidation>;

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
  address: z.object({
    addressName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }),
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
  receivedDate: z
    .date()
    .refine((date) => date <= new Date(), {
      message: "Received date cannot be in the future",
    })
    .default(new Date()),
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

// Chart of Account
export const ChartOfAccountFormValidation = z.object({
  accountName: z
    .string()
    .nonempty("Account name is required")
    .min(2, "Account name must be at least 2 characters"),
  accountType: z
    .enum(Object.values(ChartOfAccountType) as [string, ...string[]])
    .default(ChartOfAccountType.REVENUE),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isControlAccount: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});

export type ChartOfAccountFormValues = z.infer<
  typeof ChartOfAccountFormValidation
>;

const AccountAddressSchema = z.object({
  addressName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

// Base schema for Account creation/update
export const AccountFormValidation = z.object({
  name: z
    .string()
    .nonempty("Account name is required")
    .min(2, "Account name must be at least 2 characters"),
  accountType: z.nativeEnum(AccountType).default(AccountType.CASH_ON_HAND),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAddress: AccountAddressSchema.optional(),
  swiftCode: z.string().optional().nullable(),
  merchantCode: z.string().optional().nullable(),
  openingBalance: z.number().min(0, "Opening balance cannot be negative"),
  currentBalance: z
    .number()
    .min(0, "Current balance cannot be negative")
    .optional(),
  currency: z.string().nonempty("Currency is required"),
  chartOfAccountsId: z
    .string()
    .nonempty("Linked Chart of Accounts ID is required"),
});

// Refined schema for Account validation (to add conditional logic)
export const AccountFormValidationRefined = AccountFormValidation.superRefine(
  (data, ctx) => {
    // If account type is 'bank', bankName, accountNumber are generally expected
    if (data.accountType === "bank") {
      if (!data.bankName || data.bankName.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank name is required for bank accounts",
          path: ["bankName"],
        });
      }
      if (!data.accountNumber || data.accountNumber.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Account number is required for bank accounts",
          path: ["accountNumber"],
        });
      }
    }

    // If account type is 'mobile_money', merchantCode and accountNumber might be expected
    if (data.accountType === "mobile_money") {
      if (!data.accountNumber || data.accountNumber.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Account number is required for mobile money accounts",
          path: ["accountNumber"],
        });
      }
      // merchantCode can still be optional for some mobile money setups
    }

    // For 'cash_on_hand', accountNumber, bankName, swiftCode, merchantCode should be null/empty
    if (data.accountType === "cash_on_hand") {
      if (data.accountNumber && data.accountNumber.trim() !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Account number is not applicable for cash on hand",
          path: ["accountNumber"],
        });
      }
      if (data.bankName && data.bankName.trim() !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank name is not applicable for cash on hand",
          path: ["bankName"],
        });
      }
      if (data.swiftCode && data.swiftCode.trim() !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SWIFT code is not applicable for cash on hand",
          path: ["swiftCode"],
        });
      }
      if (data.merchantCode && data.merchantCode.trim() !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Merchant code is not applicable for cash on hand",
          path: ["merchantCode"],
        });
      }
    }
  }
);

export type AccountFormValues = z.infer<typeof AccountFormValidationRefined>;

// --- Filters for Account fetching ---
export const AccountFiltersSchema = z.object({
  search: z.string().optional(),
  accountType: z.string().optional(),
});
export type AccountFilters = z.infer<typeof AccountFiltersSchema>;

// --- Base Category Schema ---
const BaseCategoryValidation = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  chartOfAccountsId: z
    .string()
    .nonempty("Linked Chart of Accounts ID is required"),
});

// --- Expense Category Validation ---
export const ExpenseCategoryFormValidation = BaseCategoryValidation.extend({});
export type ExpenseCategoryFormValues = z.infer<
  typeof ExpenseCategoryFormValidation
>;

// --- Income Category Validation ---
export const IncomeCategoryFormValidation = BaseCategoryValidation.extend({});
export type IncomeCategoryFormValues = z.infer<
  typeof IncomeCategoryFormValidation
>;

// --- Accompanying Expense Type Validation ---
export const AccompanyingExpenseTypeFormValidation = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  defaultExpenseCategoryId: z
    .string()
    .nonempty("Default Expense Category is required"),
});
export type AccompanyingExpenseTypeFormValues = z.infer<
  typeof AccompanyingExpenseTypeFormValidation
>;

// --- Filters for Category fetching ---
export const CategoryFiltersSchema = z.object({
  search: z.string().optional(),
  chartOfAccountsId: z.string().optional(),
});
export type ExpenseCategoryFilters = z.infer<typeof CategoryFiltersSchema>;

export type IncomeCategoryFilters = z.infer<typeof CategoryFiltersSchema>;

// --- Filters for Accompanying Expense Type fetching ---
export const AccompanyingExpenseTypeFiltersSchema = z.object({
  search: z.string().optional(),
});
export type AccompanyingExpenseTypeFilters = z.infer<
  typeof AccompanyingExpenseTypeFiltersSchema
>;

// Expenses
export const ExpenseItemValidation = z
  .object({
    id: z.string().optional(), // Optional for existing items (used for update/delete)
    title: z
      .string()
      .nonempty("Title is required")
      .min(2, "Item title must be at least 2 characters"),
    itemAmount: z.number().min(0.01, "Amount must be greater than 0"),
    expenseCategoryId: z.string().nonempty("Expense Category is required"),
    payee: z.string().nonempty("Payee is required for this item"),
    notes: z.string().optional().nullable(),
    isAccompanyingExpense: z.boolean().default(false),
    purchaseId: z.string().optional().nullable(),
    accompanyingExpenseTypeId: z.string().optional().nullable(),
    payingAccountId: z
      .string()
      .nonempty("Paying Account is required for this item"),
    currentPayingAccountBalance: z
      .number()
      .min(0, "Balance cannot be negative")
      .optional(),

    originalItemAmount: z.number().optional(),
    originalPayingAccountId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional validation for accompanying expense fields (per line item)
    if (data.isAccompanyingExpense) {
      if (!data.purchaseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Purchase Order is required for accompanying expenses",
          path: ["purchaseId"],
        });
      }
      if (!data.accompanyingExpenseTypeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Accompanying Expense Type is required",
          path: ["accompanyingExpenseTypeId"],
        });
      }
    }

    if (
      data.currentPayingAccountBalance !== undefined &&
      data.payingAccountId
    ) {
      let availableBalance = data.currentPayingAccountBalance;

      if (
        data.id &&
        data.originalPayingAccountId === data.payingAccountId &&
        data.originalItemAmount !== undefined
      ) {
        availableBalance += data.originalItemAmount;
      }

      if (availableBalance < data.itemAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Insufficient funds. Available: ${availableBalance.toFixed(
            2
          )}, Required: ${data.itemAmount.toFixed(2)}`,
          path: ["payingAccountId"],
        });
      }
    }
  });

export type ExpenseItemFormValues = z.infer<typeof ExpenseItemValidation>;

// --- Expense Form Validation ---
export const ExpenseFormValidation = z
  .object({
    amount: z.number().min(0, "Total amount cannot be negative"),
    expenseDate: z.date().refine((date) => date <= new Date(), {
      message: "Expense date cannot be in the future",
    }),

    referenceNumber: z.string().nonempty("Reference number is required"),
    notes: z.string().optional().nullable(),
    attachments: z.any().optional(),

    items: z
      .array(ExpenseItemValidation)
      .min(1, "At least one expense line item is required"),

    isEditMode: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // Validate that total amount matches sum of item amounts
    const calculatedTotal = data.items.reduce(
      (sum, item) => sum + item.itemAmount,
      0
    );
    if (Math.abs(calculatedTotal - data.amount) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total amount (${data.amount.toFixed(
          2
        )}) must match sum of item amounts (${calculatedTotal.toFixed(2)})`,
        path: ["amount"],
      });
    }

    if (data.isEditMode) {
      // Group items by paying account to calculate net changes
      const accountNetChanges = new Map<
        string,
        {
          currentBalance: number;
          netChange: number;
          items: Array<{ title: string; required: number }>;
        }
      >();

      data.items.forEach((item) => {
        if (
          !item.payingAccountId ||
          item.currentPayingAccountBalance === undefined
        ) {
          return;
        }

        const accountId = item.payingAccountId;

        if (!accountNetChanges.has(accountId)) {
          accountNetChanges.set(accountId, {
            currentBalance: item.currentPayingAccountBalance,
            netChange: 0,
            items: [],
          });
        }

        const accountData = accountNetChanges.get(accountId)!;

        let itemNetChange = -item.itemAmount;

        if (item.id && item.originalItemAmount !== undefined) {
          if (item.originalPayingAccountId === accountId) {
            itemNetChange += item.originalItemAmount;
          }
        }

        accountData.netChange += itemNetChange;
        accountData.items.push({
          title: item.title,
          required: item.itemAmount,
        });
      });

      // Validate each account has sufficient funds after net changes
      accountNetChanges.forEach((accountData, accountId) => {
        const finalBalance = accountData.currentBalance + accountData.netChange;

        if (finalBalance < 0) {
          const itemTitles = accountData.items.map((i) => i.title).join(", ");
          const affectedItemIndices = data.items
            .map((item, idx) => (item.payingAccountId === accountId ? idx : -1))
            .filter((idx) => idx !== -1);

          affectedItemIndices.forEach((index) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Insufficient funds for this account after all changes. Current: ${accountData.currentBalance.toFixed(
                2
              )}, Net change: ${accountData.netChange.toFixed(
                2
              )}, Would result in: ${finalBalance.toFixed(
                2
              )}. Affected items: ${itemTitles}`,
              path: ["items", index, "payingAccountId"],
            });
          });
        }
      });
    } else {
      // CREATE MODE: Group by account and validate cumulative amounts
      const accountTotals = new Map<
        string,
        {
          currentBalance: number;
          totalRequired: number;
          items: Array<{ title: string; amount: number }>;
        }
      >();

      data.items.forEach((item) => {
        if (
          !item.payingAccountId ||
          item.currentPayingAccountBalance === undefined
        ) {
          return;
        }

        const accountId = item.payingAccountId;

        if (!accountTotals.has(accountId)) {
          accountTotals.set(accountId, {
            currentBalance: item.currentPayingAccountBalance,
            totalRequired: 0,
            items: [],
          });
        }

        const accountData = accountTotals.get(accountId)!;
        accountData.totalRequired += item.itemAmount;
        accountData.items.push({
          title: item.title,
          amount: item.itemAmount,
        });
      });

      // Validate each account
      accountTotals.forEach((accountData, accountId) => {
        if (accountData.currentBalance < accountData.totalRequired) {
          const itemDetails = accountData.items
            .map((i) => `"${i.title}" ($${i.amount.toFixed(2)})`)
            .join(", ");

          const affectedItemIndices = data.items
            .map((item, idx) => (item.payingAccountId === accountId ? idx : -1))
            .filter((idx) => idx !== -1);

          affectedItemIndices.forEach((index) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Insufficient funds in this account. Available: ${accountData.currentBalance.toFixed(
                2
              )}, Total required for all items: ${accountData.totalRequired.toFixed(
                2
              )}, Shortfall: ${(
                accountData.totalRequired - accountData.currentBalance
              ).toFixed(2)}. Items using this account: ${itemDetails}`,
              path: ["items", index, "payingAccountId"],
            });
          });
        }
      });
    }
  });
export type ExpenseFormValues = z.infer<typeof ExpenseFormValidation>;

// Income (Payments Received)
export const IncomeFormValidation = z
  .object({
    paymentRefNumber: z
      .string()
      .nonempty("Payment reference number is required"),
    paymentDate: z.date().refine((date) => date <= new Date(), {
      message: "Payment date cannot be in the future",
    }),
    customerId: z.string().optional().nullable(), // Optional for other income
    saleId: z.string().optional().nullable(), // Optional for other income
    incomeCategoryId: z.string().optional().nullable(), // Optional for sales income (will default)
    receivingAccountId: z.string().nonempty("Receiving Account is required"),
    amountReceived: z
      .number()
      .min(0.01, "Amount received must be greater than 0"),
    balanceDueAfterPayment: z
      .number()
      .min(0, "Balance due cannot be negative")
      .optional(),
    paymentMethod: z
      .enum(Object.values(PaymentMethod) as [string, ...string[]])
      .default(PaymentMethod.Cash),
    notes: z.string().optional().nullable(),
    attachments: z.any().optional(),
    currentReceivingAccountBalance: z
      .number()
      .min(0, "Balance cannot be negative")
      .optional(),
    checkNumber: z.string().optional().nullable(),
    checkBankName: z.string().optional().nullable(),
    checkDate: z.date().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // If a saleId is provided, customerId must also be present
    if (data.saleId && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customer is required when linking to a sale",
        path: ["customerId"],
      });
    }

    // If no saleId, then an incomeCategoryId is required (for other income)
    if (!data.saleId && !data.incomeCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Income Category is required for non-sales income",
        path: ["incomeCategoryId"],
      });
    }

    // If both saleId and incomeCategoryId are provided, prefer saleId logic.
    // The backend logic will handle defaulting incomeCategoryId for sales.
  });

export type IncomeFormValues = z.infer<typeof IncomeFormValidation>;

// Filters for Income fetching
export const IncomeFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  saleId: z.string().optional(),
  incomeCategoryId: z.string().optional(),
  receivingAccountId: z.string().optional(),
  paymentMethod: z
    .enum(Object.values(PaymentMethod) as [string, ...string[]])
    .optional(),
  paymentDate_start: z.string().optional(),
  paymentDate_end: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
});
export type IncomeFilters = z.infer<typeof IncomeFiltersSchema>;

// Schema for individual purchase being paid by a bill payment
export const BillPaymentItemSchema = z.object({
  purchaseId: z.string().nonempty("Purchase ID is required"),
  amountToPay: z.number().min(0.01, "Amount to pay must be greater than 0"),
  purchaseNumber: z.string().nonempty("Purchase Number is required"), // For display/context
  totalAmount: z.number().min(0, "Total Amount must be 0 or more"), // For display/context
  amountPaidSoFar: z.number().min(0, "Amount Paid So Far must be 0 or more"), // For display/context
});
export type BillPaymentItem = z.infer<typeof BillPaymentItemSchema>;

// Schema for payment allocation from specific accounts
export const BillPaymentAccountAllocationSchema = z.object({
  payingAccountId: z.string().nonempty("Paying Account is required"),
  amountPaidFromAccount: z
    .number()
    .min(0.01, "Amount paid from account must be greater than 0"),
  accountName: z.string().optional(), // For display/context
  currentBalance: z.number().optional(), // For display/context
});
export type BillPaymentAccountAllocation = z.infer<
  typeof BillPaymentAccountAllocationSchema
>;

// Schema for payment-specific accompanying expenses (e.g., bank transfer fees)
export const BillPaymentAccompanyingExpenseSchema = z.object({
  accompanyingExpenseTypeId: z
    .string()
    .nonempty("Accompanying Expense Type is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payee: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  expenseTypeName: z.string().optional(), // For display/context
});
export type BillPaymentAccompanyingExpense = z.infer<
  typeof BillPaymentAccompanyingExpenseSchema
>;

// Main Bill Payment Form Validation
export const BillPaymentFormValidation = z
  .object({
    billReferenceNo: z.string().nonempty("Bill reference number is required"),
    paymentDate: z.date().refine((date) => date <= new Date(), {
      message: "Payment date cannot be in the future",
    }),
    vendorId: z.string().nonempty("Vendor is required"),
    generalComments: z.string().optional().nullable(),
    attachments: z.any().optional(), // File uploads
    // Arrays for linked records
    purchasesToPay: z
      .array(BillPaymentItemSchema)
      .min(1, "At least one purchase must be selected for payment"),
    payingAccounts: z
      .array(BillPaymentAccountAllocationSchema)
      .min(1, "At least one paying account must be used"),
    accompanyingExpenses: z
      .array(BillPaymentAccompanyingExpenseSchema)
      .optional()
      .nullable(),
    // Calculated totals (will be re-calculated server-side for security)
    totalPaymentAmount: z
      .number()
      .min(0.01, "Total payment amount must be greater than 0"),
    totalAccompanyingExpenses: z
      .number()
      .min(0, "Total accompanying expenses cannot be negative"),
  })
  .superRefine((data, ctx) => {
    // Validate that total amount paid from accounts matches total purchases to pay + accompanying expenses
    const calculatedTotalPaidFromAccounts = data.payingAccounts.reduce(
      (sum, acc) => sum + acc.amountPaidFromAccount,
      0
    );
    const calculatedTotalPurchasesPaid = data.purchasesToPay.reduce(
      (sum, item) => sum + item.amountToPay,
      0
    );
    const calculatedTotalAccompanyingExpenses = data.accompanyingExpenses
      ? data.accompanyingExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      : 0;

    const expectedTotalPayment =
      calculatedTotalPurchasesPaid + calculatedTotalAccompanyingExpenses;

    if (
      Math.abs(calculatedTotalPaidFromAccounts - expectedTotalPayment) > 0.001
    ) {
      // Small epsilon for floating point comparison
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total funds from accounts (${calculatedTotalPaidFromAccounts.toFixed(
          2
        )}) must match total amount of purchases to pay (${calculatedTotalPurchasesPaid.toFixed(
          2
        )}) plus accompanying expenses (${calculatedTotalAccompanyingExpenses.toFixed(
          2
        )}). Expected total: ${expectedTotalPayment.toFixed(2)}`,
        path: ["payingAccounts"],
      });
    }

    // Validate no duplicate paying accounts
    const uniquePayingAccounts = new Set(
      data.payingAccounts.map((acc) => acc.payingAccountId)
    );
    if (uniquePayingAccounts.size !== data.payingAccounts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate paying accounts are not allowed.",
        path: ["payingAccounts"],
      });
    }

    // Validate that 'totalPaymentAmount' reflects the sum of all outflows for display/summary
    if (
      Math.abs(data.totalPaymentAmount - expectedTotalPayment) > 0.001 &&
      data.totalPaymentAmount !== 0
    ) {
      // Allow 0 for initial state if needed, otherwise enforce match
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Displayed total payment amount (${data.totalPaymentAmount.toFixed(
          2
        )}) does not match calculated total outflow (${expectedTotalPayment.toFixed(
          2
        )}).`,
        path: ["totalPaymentAmount"],
      });
    }
  });
export type BillPaymentFormValues = z.infer<typeof BillPaymentFormValidation>;

// --- Filters for Bill Tracker ---
export const BillTrackerFiltersSchema = z.object({
  search: z.string().optional(),
  vendorId: z.string().optional(),
  type: z
    .enum(["all", "purchase_orders", "open_bills", "due_bills", "paid_bill"])
    .default("all"),
  status: z.enum(["all", "open", "overdue", "paid"]).default("all"),
  dateRange: z
    .enum([
      "all",
      "today",
      "yesterday",
      "one_week",
      "two_weeks",
      "this_month",
      "next_one_week",
      "next_two_weeks",
      "next_one_month",
      "next_one_quarter",
    ])
    .default("all"),
  specificDate_start: z.string().optional(),
  specificDate_end: z.string().optional(),
});
export type BillTrackerFilters = z.infer<typeof BillTrackerFiltersSchema>;

// filters for income tracker
export const IncomeTrackerFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  saleId: z.string().optional(),
  paymentMethod: z
    .enum(Object.values(PaymentMethod) as [string, ...string[]])
    .optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
  status: z.enum(["all", "open", "overdue", "paid"]).default("all"),
  dateRange: z
    .enum(Object.values(DateRange) as [string, ...string[]])
    .default(DateRange.ALL),
  specificDate_start: z.string().optional(),
  specificDate_end: z.string().optional(),
});
export type IncomeTrackerFilters = z.infer<typeof IncomeTrackerFiltersSchema>;

// Receipt Form Validation
export const ReceiptFormValidation = z
  .object({
    receiptNumber: z.string().nonempty("Receipt number is required"),
    receiptDate: z.date().refine((date) => date <= new Date(), {
      message: "Receipt date cannot be in the future",
    }),
    customerId: z.string().nonempty("Customer is required"),
    totalAmountReceived: z
      .number()
      .min(0, "Total amount received must be 0 or more"),
    totalAmountDue: z.number().min(0, "Total amount due must be 0 or more"),
    totalBalanceDue: z.number().min(0, "Total balance due must be 0 or more"),
    attachments: z.any().optional(),
    receiptItems: z
      .array(
        z.object({
          paymentReceivedId: z
            .string()
            .nonempty("Payment received ID is required"),
          invoiceNumber: z.string().optional().nullable(),
          invoiceDate: z.date().optional().nullable(),
          amountDue: z.number().min(0, "Amount due must be 0 or more"),
          amountReceived: z
            .number()
            .min(0.01, "Amount received must be greater than 0"),
          balanceDue: z
            .number()
            .min(0, "Balance due must be 0 or more")
            .optional()
            .nullable(),
          paymentMethod: z
            .enum(Object.values(PaymentMethod) as [string, ...string[]])
            .default(PaymentMethod.Cash),
          saleId: z.string().optional().nullable(),
          incomeCategoryId: z.string().optional().nullable(),
        })
      )
      .min(1, "At least one receipt item is required"),

    selectedPayment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate that total amount received equals sum of receipt items
    const calculatedTotalReceived = data.receiptItems.reduce(
      (sum, item) => sum + item.amountReceived,
      0
    );

    if (Math.abs(calculatedTotalReceived - data.totalAmountReceived) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total amount received (${data.totalAmountReceived.toFixed(
          2
        )}) must match sum of receipt items (${calculatedTotalReceived.toFixed(
          2
        )})`,
        path: ["totalAmountReceived"],
      });
    }

    // Validate that each item with saleId has required invoice details
    data.receiptItems.forEach((item, index) => {
      if (item.saleId) {
        if (!item.invoiceNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invoice number is required for sales payments",
            path: ["receiptItems", index, "invoiceNumber"],
          });
        }
        if (!item.invoiceDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invoice date is required for sales payments",
            path: ["receiptItems", index, "invoiceDate"],
          });
        }
      }

      // Validate that either saleId or incomeCategoryId is present, not both
      if (item.saleId && item.incomeCategoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Receipt item cannot have both sale and income category references",
          path: ["receiptItems", index],
        });
      }

      if (!item.saleId && !item.incomeCategoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Receipt item must reference either a sale or an income category",
          path: ["receiptItems", index],
        });
      }

      // Validate balance calculation
      const calculatedBalance = item.amountDue - item.amountReceived;
      if (
        item.balanceDue !== null &&
        item.balanceDue !== undefined &&
        Math.abs(calculatedBalance - item.balanceDue) > 0.001
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Balance Due must equal amount due minus amount received`,
          path: ["receiptItems", index, "balanceDue"],
        });
      }
    });
  });

export type ReceiptFormValues = z.infer<typeof ReceiptFormValidation>;

// Filters for Receipt fetching
export const ReceiptFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  receiptDate_start: z.string().optional(),
  receiptDate_end: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
});
export type ReceiptFilters = z.infer<typeof ReceiptFiltersSchema>;

// --- Sales Agent Form Validation ---
export const SalesAgentFormValidation = z.object({
  name: z.string().nonempty("Agent name is required"),
  email: z.string().optional(),
  phone: z.string().nonempty("Phone number is required"),
  agentCode: z
    .string()
    .nonempty("Agent code is required")
    .min(2, "Agent code must be at least 2 characters"),
  userId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type SalesAgentFormValues = z.infer<typeof SalesAgentFormValidation>;

// --- Commission Recipient Item (for splitting total) ---
export const CommissionRecipientItemValidation = z.object({
  id: z.string().optional(),
  salesAgentId: z.string().nonempty("Sales Agent is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
});
export type CommissionRecipientItemFormValues = z.infer<
  typeof CommissionRecipientItemValidation
>;

// --- Single Sale Commission Entry ---
export const SaleCommissionEntryValidation = z.object({
  id: z.string().optional(),
  saleId: z.string().nonempty("Sale (Invoice) is required"),
  amountReceived: z
    .number()
    .min(0.01, "Amount received must be greater than 0"),
  additions: z.number().min(0, "Additions cannot be negative").default(0),
  deductions: z.number().min(0, "Deductions cannot be negative").default(0),
  commissionRate: z
    .number()
    .min(0, "Commission rate is required and must be greater than 0")
    .max(100, "Commission rate cannot exceed 100"),
  withholdingTaxRate: z
    .number()
    .min(0, "WHT rate cannot be negative")
    .max(100, "WHT rate cannot exceed 100")
    .default(0),
  withholdingTaxId: z.string().optional().nullable(),

  // Calculated fields
  baseForCommission: z.number().optional(),
  grossCommission: z.number().optional(),
  withholdingTaxAmount: z.number().optional(),
  totalCommissionPayable: z.number().optional(),
});

export type SaleCommissionEntryFormValues = z.infer<
  typeof SaleCommissionEntryValidation
>;

// --- Sales Commission Calculation & Payment Form Validation ---
export const SalesCommissionFormValidation = z
  .object({
    commissionRefNumber: z
      .string()
      .nonempty("Commission reference number is required"),
    commissionDate: z.date().refine((date) => date <= new Date(), {
      message: "Commission date cannot be in the future",
    }),
    customerId: z.string().nonempty("Customer is required"),

    commissionSales: z
      .array(SaleCommissionEntryValidation)
      .min(1, "At least one sale entry is required for the commission"),

    notes: z.string().optional().nullable(),

    totalAmountReceived: z.number().optional(),
    totalAdditions: z.number().optional(),
    totalDeductions: z.number().optional(),
    totalBaseForCommission: z.number().optional(),
    totalGrossCommission: z.number().optional(),
    totalWithholdingTaxAmount: z.number().optional(),
    totalCommissionPayable: z.number().optional(),
    recipients: z
      .array(CommissionRecipientItemValidation)
      .min(1, "At least one recipient is required"),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate sales across all entries
    const uniqueSaleIds = new Set<string>();
    data.commissionSales.forEach((entry, index) => {
      if (uniqueSaleIds.has(entry.saleId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This sale has already been added to the commission.",
          path: ["commissionSales", index, "saleId"],
        });
      }
      uniqueSaleIds.add(entry.saleId);

      // --- Per-Sale Entry Calculations & Validations (Moved from previous main validation) ---
      const amountReceived = entry.amountReceived || 0;
      const additions = entry.additions || 0;
      const deductions = entry.deductions || 0;
      const commissionRate = (entry.commissionRate || 0) / 100;
      const withholdingTaxRate = (entry.withholdingTaxRate || 0) / 100;

      const {
        baseForCommission: calculatedBaseForCommission,
        grossCommission: calculatedGrossCommission,
        withholdingTaxAmount: calculatedWithholdingTaxAmount,
        totalCommissionPayable: calculatedTotalCommissionPayable,
      } = calculateCommissionAmounts(
        amountReceived,
        additions,
        deductions,
        commissionRate,
        withholdingTaxRate
      );

      // Validate calculated fields for THIS sale entry
      if (
        entry.baseForCommission !== undefined &&
        entry.baseForCommission !== null &&
        Math.abs(entry.baseForCommission - calculatedBaseForCommission) > 0.01
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Base for Commission should be ${calculatedBaseForCommission.toFixed(
            2
          )} for this sale.`,
          path: ["commissionSales", index, "baseForCommission"],
        });
      }

      if (
        entry.grossCommission !== undefined &&
        entry.grossCommission !== null &&
        Math.abs(entry.grossCommission - calculatedGrossCommission) > 0.01
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Gross Commission should be ${calculatedGrossCommission.toFixed(
            2
          )} for this sale.`,
          path: ["commissionSales", index, "grossCommission"],
        });
      }

      if (
        entry.withholdingTaxAmount !== undefined &&
        entry.withholdingTaxAmount !== null &&
        Math.abs(entry.withholdingTaxAmount - calculatedWithholdingTaxAmount) >
          0.01
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Withholding Tax Amount should be ${calculatedWithholdingTaxAmount.toFixed(
            2
          )} for this sale.`,
          path: ["commissionSales", index, "withholdingTaxAmount"],
        });
      }

      if (
        entry.totalCommissionPayable !== undefined &&
        entry.totalCommissionPayable !== null &&
        Math.abs(
          entry.totalCommissionPayable - calculatedTotalCommissionPayable
        ) > 0.01
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total Commission Payable should be ${calculatedTotalCommissionPayable.toFixed(
            2
          )} for this sale.`,
          path: ["commissionSales", index, "totalCommissionPayable"],
        });
      }
    });

    // Check for duplicate sales agents
    const uniqueSalesAgentsPerSale = new Set<string>();
    data.recipients.forEach((recipient, index) => {
      if (
        recipient.salesAgentId &&
        uniqueSalesAgentsPerSale.has(recipient.salesAgentId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Duplicate sales agent in recipients is not allowed for the commission.",
          path: ["recipients", index, "salesAgentId"],
        });
      }
      if (recipient.salesAgentId) {
        uniqueSalesAgentsPerSale.add(recipient.salesAgentId);
      }
    });

    const grandTotalAmountReceived = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.amountReceived || 0),
      0
    );
    const grandTotalAdditions = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.additions || 0),
      0
    );
    const grandTotalDeductions = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.deductions || 0),
      0
    );
    const grandTotalBaseForCommission = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.baseForCommission || 0),
      0
    );
    const grandTotalGrossCommission = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.grossCommission || 0),
      0
    );
    const grandTotalWithholdingTaxAmount = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.withholdingTaxAmount || 0),
      0
    );
    const grandTotalCommissionPayable = data.commissionSales.reduce(
      (sum, entry) => sum + (entry.totalCommissionPayable || 0),
      0
    );

    // If these fields are sent from frontend, validate them. Otherwise, backend computes.
    if (
      data.totalAmountReceived !== undefined &&
      Math.abs(data.totalAmountReceived - grandTotalAmountReceived) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Amount Received (${data.totalAmountReceived.toFixed(
          2
        )}) does not match sum of entries (${grandTotalAmountReceived.toFixed(
          2
        )}).`,
        path: ["totalAmountReceived"],
      });
    }

    if (
      data.totalAdditions !== undefined &&
      Math.abs(data.totalAdditions - grandTotalAdditions) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Additions (${data.totalAdditions.toFixed(
          2
        )}) does not match sum of entries (${grandTotalAdditions.toFixed(2)}).`,
        path: ["totalAdditions"],
      });
    }

    if (
      data.totalDeductions !== undefined &&
      Math.abs(data.totalDeductions - grandTotalDeductions) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Deductions (${data.totalDeductions.toFixed(
          2
        )}) does not match sum of entries (${grandTotalDeductions.toFixed(
          2
        )}).`,
        path: ["totalDeductions"],
      });
    }

    if (
      data.totalBaseForCommission !== undefined &&
      Math.abs(data.totalBaseForCommission - grandTotalBaseForCommission) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Base for Commission (${data.totalBaseForCommission.toFixed(
          2
        )}) does not match sum of entries (${grandTotalBaseForCommission.toFixed(
          2
        )}).`,
        path: ["totalBaseForCommission"],
      });
    }

    if (
      data.totalGrossCommission !== undefined &&
      Math.abs(data.totalGrossCommission - grandTotalGrossCommission) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Gross Commission (${data.totalGrossCommission.toFixed(
          2
        )}) does not match sum of entries (${grandTotalGrossCommission.toFixed(
          2
        )}).`,
        path: ["totalGrossCommission"],
      });
    }

    if (
      data.totalWithholdingTaxAmount !== undefined &&
      Math.abs(
        data.totalWithholdingTaxAmount - grandTotalWithholdingTaxAmount
      ) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Withholding Tax (${data.totalWithholdingTaxAmount.toFixed(
          2
        )}) does not match sum of entries (${grandTotalWithholdingTaxAmount.toFixed(
          2
        )}).`,
        path: ["totalWithholdingTaxAmount"],
      });
    }

    if (
      data.totalCommissionPayable !== undefined &&
      Math.abs(data.totalCommissionPayable - grandTotalCommissionPayable) > 0.01
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Overall Total Commission Payable (${data.totalCommissionPayable.toFixed(
          2
        )}) does not match sum of entries (${grandTotalCommissionPayable.toFixed(
          2
        )}).`,
        path: ["totalCommissionPayable"],
      });
    }
  });

export type SalesCommissionFormValues = z.infer<
  typeof SalesCommissionFormValidation
>;

export const RecipientPayoutEntryValidation = z.object({
  id: z.string().optional(),
  commissionRecipientId: z.string().nonempty("Recipient is required"),
  payingAccountId: z.string().nonempty("Paying Account is required"),
  expenseCategoryId: z.string().nonempty("Expense Category is required"),
  amountToPay: z.number().min(0.01, "Amount to pay must be greater than 0"),
  recipientName: z.string().optional(),
  allocatedAmount: z.number().optional(),
  paidSoFar: z.number().optional(),
  remainingDue: z.number().optional(),
  currentPayingAccountBalance: z.number().optional(),
});
export type RecipientPayoutEntryFormValues = z.infer<
  typeof RecipientPayoutEntryValidation
>;

// --- Commission Recipient Payout Form Validation ---
export const CommissionRecipientPayoutFormValidation = z
  .object({
    payoutDate: z.date().refine((date) => date <= new Date(), {
      message: "Payout date cannot be in the future",
    }),
    payouts: z
      .array(RecipientPayoutEntryValidation)
      .min(1, "At least one recipient payout is required"),
    notes: z.string().optional().nullable(),
  })
  .superRefine(async (data, ctx) => {
    const recipientIds = new Set<string>();
    for (const [index, payout] of data.payouts.entries()) {
      if (recipientIds.has(payout.commissionRecipientId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate recipient in payouts is not allowed.",
          path: ["payouts", index, "commissionRecipientId"],
        });
      }
      recipientIds.add(payout.commissionRecipientId);

      // Validate amountToPay against remainingDue
      if (
        payout.remainingDue !== undefined &&
        payout.amountToPay > payout.remainingDue + 0.01
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Amount to pay (${payout.amountToPay.toFixed(
            2
          )}) exceeds remaining due (${payout.remainingDue.toFixed(2)}).`,
          path: ["payouts", index, "amountToPay"],
        });
      }

      if (
        payout.currentPayingAccountBalance !== undefined &&
        payout.amountToPay > payout.currentPayingAccountBalance + 0.01
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Insufficient funds in paying account for ${
            payout.recipientName
          }. Available: ${payout.currentPayingAccountBalance.toFixed(2)}`,
          path: ["payouts", index, "payingAccountId"],
        });
      }
    }
  });
export type CommissionRecipientPayoutFormValues = z.infer<
  typeof CommissionRecipientPayoutFormValidation
>;

// --- Commission Filter Schema ---
export const CommissionFiltersSchema = z.object({
  search: z.string().optional(),
  salesAgentId: z.string().optional(),
  saleId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.nativeEnum(CommissionStatus).optional(),
  paymentStatus: z.nativeEnum(CommissionPaymentStatus).optional(),
  commissionDate_start: z.string().optional(),
  commissionDate_end: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
});
export type CommissionFilters = z.infer<typeof CommissionFiltersSchema>;

export const SalesAgentFiltersSchema = z.object({
  search: z.string().optional(),
});
export type SalesAgentFilters = z.infer<typeof SalesAgentFiltersSchema>;

export const CommissionPayoutFiltersSchema = z.object({
  search: z.string().optional(),
  payoutRefNumber: z.string().optional(),
  commissionId: z.string().optional(),
  commissionRecipientId: z.string().optional(),
  salesAgentId: z.string().optional(),
  payingAccountId: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  payoutDate_start: z.string().optional(),
  payoutDate_end: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
});
export type CommissionPayoutFilters = z.infer<
  typeof CommissionPayoutFiltersSchema
>;

// Backorder Fulfillment Form
export const BackorderFulfillmentValidation = z.object({
  backorderId: z.string().nonempty("Backorder ID is required"),
  inventoryStockId: z.string().nonempty("Inventory stock to use is required"),
  quantityToFulfill: z
    .number()
    .int()
    .min(1, "Quantity to fulfill must be at least 1"),
  userId: z.string().nonempty("User ID is required for logging transactions"),
});

export type BackorderFulfillmentFormValues = z.infer<
  typeof BackorderFulfillmentValidation
>;

export const RoleFormValidation = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.record(
    z.object({
      canCreate: z.boolean(),
      canRead: z.boolean(),
      canUpdate: z.boolean(),
      canDelete: z.boolean(),
    })
  ),
});

export type RoleFormValues = z.infer<typeof RoleFormValidation>;
