"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import { DeliveryFormValues } from "../validation";
import {
  deliveryItemsTable,
  deliveriesTable,
  salesTable,
  customersTable,
  storesTable,
} from "@/drizzle/schema";
import { DeliveryStatus } from "@/types";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { DeliveryFilters } from "@/hooks/useDeliveries";
import { getSaleById } from "./sale.actions";

// Add a new delivery
export const addDelivery = async (delivery: DeliveryFormValues) => {
  try {
    // verify sale has no delivery
    const sale = await getSaleById(delivery.saleId);

    if (sale && sale.delivery) {
      throw new Error("Sale already has a delivery");
    }

    const result = await db.transaction(async (tx) => {
      // Create main delivery record
      const [newDelivery] = await tx
        .insert(deliveriesTable)
        .values({
          deliveryDate: delivery.deliveryDate,
          deliveryRefNumber: delivery.deliveryRefNumber,
          status: delivery.status as DeliveryStatus,
          deliveryAddress: delivery.deliveryAddress
            ? {
                addressName: delivery.deliveryAddress.addressName || "",
                address: delivery.deliveryAddress.address || "",
                city: delivery.deliveryAddress.city || "",
                state: delivery.deliveryAddress.state || "",
                country: delivery.deliveryAddress.country || "",
                email: delivery.deliveryAddress.email || "",
                phone: delivery.deliveryAddress.phone || "",
              }
            : null,
          customerId: delivery.customerId,
          storeId: delivery.storeId,
          saleId: delivery.saleId,
          deliveredBy: delivery.deliveredBy || "",
          receivedBy: delivery.receivedBy || "",
          notes: delivery.notes,
        })
        .returning();

      // Process each product in the delivery
      const deliveryItems = [];
      for (const product of delivery.products) {
        // Create delivery item
        const [deliveryItem] = await tx
          .insert(deliveryItemsTable)
          .values({
            deliveryId: newDelivery.id,
            productId: product.productId,
            quantityRequested: product.quantityRequested,
            quantitySupplied: product.quantitySupplied,
            balanceLeft: product.balanceLeft,
            productName: product.productName,
            productID: product.productID,
          })
          .returning();

        deliveryItems.push(deliveryItem);
      }

      // update sale
      await tx
        .update(salesTable)
        .set({ isDeliveryNoteCreated: true })
        .where(eq(salesTable.id, delivery.saleId));

      return { delivery: newDelivery, items: deliveryItems };
    });

    revalidatePath("/deliveries");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating delivery:", error);
    throw error;
  }
};

// Get Delivery by ID
export const getDeliveryById = async (deliveryId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main delivery record
      const delivery = await tx
        .select({
          delivery: deliveriesTable,
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(deliveriesTable)
        .leftJoin(salesTable, eq(deliveriesTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(deliveriesTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(deliveriesTable.storeId, storesTable.id))
        .where(
          and(
            eq(deliveriesTable.id, deliveryId),
            eq(deliveriesTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!delivery) return null;

      // Get all items for this delivery
      const items = await tx
        .select()
        .from(deliveryItemsTable)
        .where(
          and(
            eq(deliveryItemsTable.deliveryId, deliveryId),
            eq(deliveryItemsTable.isActive, true)
          )
        );

      return {
        ...delivery,
        products: items,
      };
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting delivery:", error);
    throw error;
  }
};

// Get all deliveries with pagination
export const getDeliveries = async (
  page: number = 0,
  limit: number = 10,
  getAllDeliveries: boolean = false,
  filters?: DeliveryFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create base query
      let deliveriesQuery = tx
        .select({
          delivery: deliveriesTable,
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(deliveriesTable)
        .leftJoin(salesTable, eq(deliveriesTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(deliveriesTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(deliveriesTable.storeId, storesTable.id))
        .$dynamic();

      // Create conditions array
      const conditions = [eq(deliveriesTable.isActive, true)];

      // Apply filters if provided
      if (filters) {
        // Delivery date range
        if (filters.deliveryDate_start) {
          conditions.push(
            gte(
              deliveriesTable.deliveryDate,
              new Date(filters.deliveryDate_start)
            )
          );
        }
        if (filters.deliveryDate_end) {
          conditions.push(
            lte(
              deliveriesTable.deliveryDate,
              new Date(filters.deliveryDate_end)
            )
          );
        }

        // Status filter
        if (filters.status) {
          conditions.push(
            eq(deliveriesTable.status, filters.status as DeliveryStatus)
          );
        }
      }

      // Apply where conditions
      deliveriesQuery = deliveriesQuery.where(and(...conditions));

      // Apply order by
      deliveriesQuery = deliveriesQuery.orderBy(
        desc(deliveriesTable.createdAt)
      );

      if (!getAllDeliveries) {
        deliveriesQuery = deliveriesQuery.limit(limit).offset(page * limit);
      }

      const deliveries = await deliveriesQuery;

      // Get all products for these deliveries in a single query
      const deliveryIds = deliveries.map((d) => d.delivery.id);
      const items =
        deliveryIds.length > 0
          ? await tx
              .select()
              .from(deliveryItemsTable)
              .where(
                and(
                  inArray(deliveryItemsTable.deliveryId, deliveryIds),
                  eq(deliveryItemsTable.isActive, true)
                )
              )
          : [];

      // Create a map of delivery ID to its items
      const itemsMap = new Map();
      items.forEach((item) => {
        if (!itemsMap.has(item.deliveryId)) {
          itemsMap.set(item.deliveryId, []);
        }
        itemsMap.get(item.deliveryId).push(item);
      });

      // Get total count for pagination
      const total = getAllDeliveries
        ? deliveries.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(deliveriesTable)
            .where(and(...conditions))
            .then((res) => res[0]?.count || 0);

      return {
        documents: deliveries.map((delivery) => ({
          ...delivery,
          products: itemsMap.get(delivery.delivery.id) || [],
        })),
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting deliveries:", error);
    throw error;
  }
};

// Edit delivery
export const editDelivery = async (
  delivery: DeliveryFormValues,
  deliveryId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Update main delivery record
      const [updatedDelivery] = await tx
        .update(deliveriesTable)
        .set({
          deliveryDate: delivery.deliveryDate,
          deliveryRefNumber: delivery.deliveryRefNumber,
          status: delivery.status as DeliveryStatus,
          deliveryAddress: delivery.deliveryAddress
            ? {
                addressName: delivery.deliveryAddress.addressName || "",
                address: delivery.deliveryAddress.address || "",
                city: delivery.deliveryAddress.city || "",
                state: delivery.deliveryAddress.state || "",
                country: delivery.deliveryAddress.country || "",
                email: delivery.deliveryAddress.email || "",
                phone: delivery.deliveryAddress.phone || "",
              }
            : null,
          customerId: delivery.customerId,
          storeId: delivery.storeId,
          saleId: delivery.saleId,
          deliveredBy: delivery.deliveredBy,
          receivedBy: delivery.receivedBy,
          notes: delivery.notes,
        })
        .where(eq(deliveriesTable.id, deliveryId))
        .returning();

      // Process each product in the updated delivery
      const deliveryItems = [];
      for (const product of delivery.products) {
        // update delivery item
        const [updatedItem] = await tx
          .update(deliveryItemsTable)
          .set({
            quantityRequested: product.quantityRequested,
            quantitySupplied: product.quantitySupplied,
            balanceLeft: product.balanceLeft,
          })
          .where(
            and(
              eq(deliveryItemsTable.deliveryId, deliveryId),
              eq(deliveryItemsTable.productId, product.productId),
              eq(deliveryItemsTable.productID, product.productID),
              eq(deliveryItemsTable.isActive, true)
            )
          )
          .returning();

        deliveryItems.push(updatedItem);
      }

      return { delivery: updatedDelivery, items: deliveryItems };
    });

    revalidatePath("/deliveries");
    return parseStringify(result);
  } catch (error) {
    console.error("Error editing delivery:", error);
    throw error;
  }
};
// Permanently delete Delivery
export const deleteDelivery = async (deliveryId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Delete delivery items
      await tx
        .delete(deliveryItemsTable)
        .where(eq(deliveryItemsTable.deliveryId, deliveryId));

      // Delete the main delivery record
      const [deletedDelivery] = await tx
        .delete(deliveriesTable)
        .where(eq(deliveriesTable.id, deliveryId))
        .returning();

      return deletedDelivery;
    });

    revalidatePath("/deliveries");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting delivery:", error);
    throw error;
  }
};

// Soft delete delivery
export const softDeleteDelivery = async (deliveryId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Soft delete delivery items
      await tx
        .update(deliveryItemsTable)
        .set({ isActive: false })
        .where(eq(deliveryItemsTable.deliveryId, deliveryId));

      // Soft delete main delivery record
      const [updatedDelivery] = await tx
        .update(deliveriesTable)
        .set({ isActive: false })
        .where(eq(deliveriesTable.id, deliveryId))
        .returning();

      return updatedDelivery;
    });

    revalidatePath("/deliveries");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting delivery:", error);
    throw error;
  }
};

// Generate delivery reference number
export const generateDeliveryRefNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastDelivery = await tx
        .select({ deliveryRefNumber: deliveriesTable.deliveryRefNumber })
        .from(deliveriesTable)
        .where(sql`delivery_ref_number LIKE ${`DO${year}/${month}/%`}`)
        .orderBy(desc(deliveriesTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastDelivery.length > 0) {
        const lastRefNumber = lastDelivery[0].deliveryRefNumber;
        const lastSequence = parseInt(
          lastRefNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");
      return `DO${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating delivery reference number:", error);
    throw error;
  }
};
