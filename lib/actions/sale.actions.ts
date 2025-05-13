"use server";
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";

import { SaleFormValues } from "../validation";
import {
  customersTable,
  saleItemsTable,
  salesTable,
  storesTable,
} from "@/drizzle/schema";
import { PaymentMethod, PaymentStatus, SaleStatus } from "@/types";
import { desc, eq, inArray, sql } from "drizzle-orm";

// Add a new sale
export const addSale = async (sale: SaleFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create main sale record
      const [newSale] = await tx
        .insert(salesTable)
        .values({
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate,
          customerId: sale.customerId,
          storeId: sale.storeId,
          subTotal: sale.subTotal,
          totalAmount: sale.totalAmount,
          discountAmount: sale.discountAmount,
          totalTaxAmount: sale.totalTaxAmount,
          amountPaid: sale.amountPaid,
          status: sale.status as SaleStatus,
          paymentMethod: sale.paymentMethod as PaymentMethod,
          paymentStatus: sale.paymentStatus as PaymentStatus,
          notes: sale.notes,
          quotationId: sale.quotationId,
          attachments: sale.attachments,
          isDeliveryAddressAdded: sale.isDeliveryAddressAdded,
          deliveryAddress: sale.deliveryAddress
            ? {
                addressName: sale.deliveryAddress.addressName || "",
                address: sale.deliveryAddress.address || "",
                city: sale.deliveryAddress.city || "",
                state: sale.deliveryAddress.state || "",
                country: sale.deliveryAddress.country || "",
                email: sale.deliveryAddress.email || "",
                phone: sale.deliveryAddress.phone || "",
              }
            : null,
        })
        .returning();

      // Create sale items
      const saleItems = await Promise.all(
        sale.products.map(async (product) => {
          const [newItem] = await tx
            .insert(saleItemsTable)
            .values({
              saleId: newSale.id,
              storeId: newSale.storeId,
              lotNumber: product.lotNumber,
              inventoryStockId: product.inventoryStockId,
              productId: product.productId,
              availableQuantity: product.availableQuantity,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              totalPrice: product.totalPrice,
              subTotal: product.subTotal,
              taxAmount: product.taxAmount,
              discountAmount: product.discountAmount,
              discountRate: product.discountRate,
              taxRate: product.taxRate,
              taxRateId: product.taxRateId,
              productName: product.productName,
              productID: product.productID,
            })
            .returning();
          return newItem;
        })
      );

      return { sale: newSale, items: saleItems };
    });

    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
};

// Edit sale
export const editSale = async (sale: SaleFormValues, saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Update main sale record
      const [updatedSale] = await tx
        .update(salesTable)
        .set({
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate,
          customerId: sale.customerId,
          storeId: sale.storeId,
          subTotal: sale.subTotal,
          totalAmount: sale.totalAmount,
          discountAmount: sale.discountAmount,
          totalTaxAmount: sale.totalTaxAmount,
          amountPaid: sale.amountPaid,
          status: sale.status as SaleStatus,
          paymentMethod: sale.paymentMethod as PaymentMethod,
          paymentStatus: sale.paymentStatus as PaymentStatus,
          notes: sale.notes,
          quotationId: sale.quotationId,
          attachments: sale.attachments,
          isDeliveryAddressAdded: sale.isDeliveryAddressAdded,
          deliveryAddress: sale.deliveryAddress
            ? {
                addressName: sale.deliveryAddress.addressName || "",
                address: sale.deliveryAddress.address || "",
                city: sale.deliveryAddress.city || "",
                state: sale.deliveryAddress.state || "",
                country: sale.deliveryAddress.country || "",
                email: sale.deliveryAddress.email || "",
                phone: sale.deliveryAddress.phone || "",
              }
            : null,
        })
        .where(eq(salesTable.id, saleId))
        .returning();

      // Existing sale items
      const existingSaleItems = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, saleId));

      // Delete existing items
      await Promise.all(
        existingSaleItems.map(async (item) => {
          await tx
            .delete(saleItemsTable)
            .where(eq(saleItemsTable.id, item.id))
            .returning();
        })
      );
      // Insert new items
      const saleItems = await Promise.all(
        sale.products.map(async (product) => {
          const [newItem] = await tx
            .insert(saleItemsTable)
            .values({
              saleId: updatedSale.id,
              storeId: updatedSale.storeId,
              lotNumber: product.lotNumber,
              inventoryStockId: product.inventoryStockId,
              productId: product.productId,
              availableQuantity: product.availableQuantity,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              totalPrice: product.totalPrice,
              subTotal: product.subTotal,
              taxAmount: product.taxAmount,
              discountAmount: product.discountAmount,
              discountRate: product.discountRate,
              taxRate: product.taxRate,
              taxRateId: product.taxRateId,
              productName: product.productName,
              productID: product.productID,
            })
            .returning();
          return newItem;
        })
      );

      return { sale: updatedSale, items: saleItems };
    });
    revalidatePath("/sales");
    revalidatePath(`/sales/edit-sale/${saleId}`);
    return parseStringify(result);
  } catch (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
};

// Get Sale by ID
export const getSaleById = async (saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main sale record
      const sale = await tx
        .select({
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
        .where(eq(salesTable.id, saleId) && eq(salesTable.isActive, true))
        .then((res) => res[0]);

      if (!sale) {
        return null;
      }

      // Get all items for this sale
      const items = await tx
        .select()
        .from(saleItemsTable)
        .where(
          eq(saleItemsTable.saleId, saleId) && eq(saleItemsTable.isActive, true)
        );

      const saleWithItems = {
        ...sale,
        products: items.map((item) => ({
          id: item.id,
          lotNumber: item.lotNumber,
          inventoryStockId: item.inventoryStockId,
          productId: item.productId,
          availableQuantity: item.availableQuantity,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          subTotal: item.subTotal,
          taxAmount: item.taxAmount,
          discountAmount: item.discountAmount,
          discountRate: item.discountRate,
          taxRate: item.taxRate,
          taxRateId: item.taxRateId,
          productName: item.productName,
          productID: item.productID,
          storeId: item.storeId,
          saleId: item.saleId,
        })),
      };

      return saleWithItems;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting sale:", error);
    throw error;
  }
};

// Get all sales with pagination
export const getSales = async (
  page: number = 0,
  limit: number = 10,
  getAllSales: boolean = false
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main sales (all or paginated)
      const salesQuery = tx
        .select({
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
        .where(eq(salesTable.isActive, true))
        .orderBy(desc(salesTable.createdAt));

      if (!getAllSales) {
        salesQuery.limit(limit).offset(page * limit);
      }

      const sales = await salesQuery;

      // Get all items for these sales in a single query
      const saleIds = sales.map((s) => s.sale.id);
      const items = await tx
        .select()
        .from(saleItemsTable)
        .where(
          inArray(saleItemsTable.saleId, saleIds) &&
            eq(saleItemsTable.isActive, true)
        );

      // Combine the data
      const salesWithItems = sales.map((sale) => ({
        ...sale,
        products: items
          .filter((item) => item.saleId === sale.sale.id)
          .map((item) => ({
            id: item.id,
            lotNumber: item.lotNumber,
            inventoryStockId: item.inventoryStockId,
            productId: item.productId,
            availableQuantity: item.availableQuantity,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            subTotal: item.subTotal,
            taxAmount: item.taxAmount,
            discountAmount: item.discountAmount,
            discountRate: item.discountRate,
            taxRate: item.taxRate,
            taxRateId: item.taxRateId,
            productName: item.productName,
            productID: item.productID,
            storeId: item.storeId,
            saleId: item.saleId,
          })),
      }));

      // Get total count for pagination
      const total = getAllSales
        ? sales.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(salesTable)
            .then((res) => res[0]?.count || 0);

      return {
        documents: salesWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting sales:", error);
    throw error;
  }
};

// Generate invoice number
export const generateInvoiceNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastSale = await tx
        .select({ invoiceNumber: salesTable.invoiceNumber })
        .from(salesTable)
        .where(
          sql`invoice_number LIKE ${`INV.${year}/${month}/%`}` &&
            eq(salesTable.isActive, true)
        )
        .orderBy(desc(salesTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastSale.length > 0) {
        const lastInvoiceNumber = lastSale[0].invoiceNumber;
        const lastSequence = parseInt(
          lastInvoiceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `INV.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    throw error;
  }
};

// Permanently delete Sale with transaction
export const deleteSale = async (saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Delete sale items first
      await tx.delete(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));

      // Delete the main sale record
      const [deletedSale] = await tx
        .delete(salesTable)
        .where(eq(salesTable.id, saleId))
        .returning();

      return deletedSale;
    });

    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }
};

// Soft delete sale with transaction
export const softDeleteSale = async (saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(saleItemsTable)
        .set({ isActive: false })
        .where(eq(saleItemsTable.saleId, saleId));

      const [updatedSale] = await tx
        .update(salesTable)
        .set({ isActive: false })
        .where(eq(salesTable.id, saleId))
        .returning();

      return updatedSale;
    });
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting sale:", error);
    throw error;
  }
};
