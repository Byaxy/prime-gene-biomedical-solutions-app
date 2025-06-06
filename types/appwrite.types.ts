/* eslint-disable @typescript-eslint/no-explicit-any */

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
