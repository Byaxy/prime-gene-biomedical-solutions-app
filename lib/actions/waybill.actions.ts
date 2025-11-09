"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import { ConvertLoanWaybillFormValues, WaybillFormValues } from "../validation";
import {
  saleItemsTable,
  salesTable,
  customersTable,
  storesTable,
  waybillsTable,
  waybillItemsTable,
  waybillItemInventoryTable,
  inventoryTable,
  inventoryTransactionsTable,
  backordersTable,
} from "@/drizzle/schema";
import {
  DeliveryStatus,
  InventoryTransactionType,
  WaybillConversionStatus,
  WaybillProductForPromissoryNote,
  WaybillType,
} from "@/types";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { WaybillFilters } from "@/hooks/useWaybills";
import {
  updatePromissoryNoteForWaybill,
  updatePromissoryNoteForWaybillEdit,
} from "./promissoryNote.actions";

const buildFilterConditions = (filters: WaybillFilters) => {
  const conditions = [];

  conditions.push(eq(waybillsTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(waybillsTable.waybillRefNumber, searchTerm),
        ilike(salesTable.invoiceNumber, searchTerm),
        ilike(customersTable.name, searchTerm),
        ilike(storesTable.name, searchTerm)
      )
    );
  }

  // date range
  if (filters.waybillDate_start) {
    conditions.push(
      gte(waybillsTable.waybillDate, new Date(filters.waybillDate_start))
    );
  }
  if (filters.waybillDate_end) {
    conditions.push(
      lte(waybillsTable.waybillDate, new Date(filters.waybillDate_end))
    );
  }

  // Status filter
  if (filters.status) {
    conditions.push(eq(waybillsTable.status, filters.status as DeliveryStatus));
  }

  // is converted filter
  if (filters.isConverted !== undefined) {
    conditions.push(eq(waybillsTable.isConverted, filters.isConverted));
  }

  // Payment Status filter
  if (filters.waybillType) {
    conditions.push(
      eq(waybillsTable.waybillType, filters.waybillType as WaybillType)
    );
  }
  if (filters.conversionStatus) {
    conditions.push(
      eq(
        waybillsTable.conversionStatus,
        filters.conversionStatus as WaybillConversionStatus
      )
    );
  }

  return conditions;
};

// Add a new waybill
export const addWaybill = async (
  waybill: WaybillFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const waybillType =
        waybill.saleId && !waybill.isLoanWaybill
          ? WaybillType.Sale
          : WaybillType.Loan;

      // 1. Create main waybill record
      const [newWaybill] = await tx
        .insert(waybillsTable)
        .values({
          waybillDate: waybill.waybillDate,
          waybillRefNumber: waybill.waybillRefNumber,
          status: waybill.status as DeliveryStatus,
          deliveryAddress: waybill.deliveryAddress
            ? {
                addressName: waybill.deliveryAddress.addressName || "",
                address: waybill.deliveryAddress.address || "",
                city: waybill.deliveryAddress.city || "",
                state: waybill.deliveryAddress.state || "",
                country: waybill.deliveryAddress.country || "",
                email: waybill.deliveryAddress.email || "",
                phone: waybill.deliveryAddress.phone || "",
              }
            : null,
          customerId: waybill.customerId,
          storeId: waybill.storeId,
          saleId: waybill.saleId ? waybill.saleId : null,
          waybillType: waybillType,
          conversionStatus:
            waybillType === WaybillType.Loan
              ? WaybillConversionStatus.Pending
              : null,
          deliveredBy: waybill.deliveredBy || "",
          receivedBy: waybill.receivedBy || "",
          notes: waybill.notes,
        })
        .returning();

      // Prepare batch data structures
      const waybillItemsData: (typeof waybillItemsTable.$inferInsert)[] = [];
      const waybillItemInventoryData: Array<{
        productIndex: number;
        inventory: Omit<
          typeof waybillItemInventoryTable.$inferInsert,
          "waybillItemId"
        >;
      }> = [];
      const inventoryUpdatesMap = new Map<
        string,
        { quantityReduction: number; currentQuantity: number }
      >();
      const inventoryTransactionsData: (typeof inventoryTransactionsTable.$inferInsert)[] =
        [];
      const productUpdatesMap = new Map<
        string,
        { quantityReduction: number }
      >();
      const saleItemUpdatesMap = new Map<
        string,
        { quantityIncrease: number }
      >();

      // Collect all inventory IDs that need to be validated
      const allInventoryIds = waybill.products.flatMap((product) =>
        product.inventoryStock.map((inv) => inv.inventoryStockId)
      );

      // Batch fetch all required inventory records
      const inventoryRecords =
        allInventoryIds.length > 0
          ? await tx
              .select()
              .from(inventoryTable)
              .where(inArray(inventoryTable.id, allInventoryIds))
          : [];

      const inventoryMap = new Map(
        inventoryRecords.map((inv) => [inv.id, inv])
      );

      // 2. Process each product and prepare batch operations
      for (const product of waybill.products) {
        const waybillItemData: typeof waybillItemsTable.$inferInsert = {
          waybillId: newWaybill.id,
          productId: product.productId,
          saleItemId:
            waybillType === WaybillType.Sale ? product.saleItemId : null,
          quantityRequested: product.quantityRequested,
          quantitySupplied: product.quantitySupplied,
          balanceLeft: product.balanceLeft,
          fulfilledQuantity: product.fulfilledQuantity,
          quantityConverted: product.quantityConverted,
          productName: product.productName,
          productID: product.productID,
        };
        waybillItemsData.push(waybillItemData);
        const currentWaybillItemIndex = waybillItemsData.length - 1;

        let totalQuantityTakenForProduct = 0;
        for (const inventory of product.inventoryStock) {
          const currentInventory = inventoryMap.get(inventory.inventoryStockId);

          if (!currentInventory) {
            throw new Error(
              `Inventory stock with ID ${inventory.inventoryStockId} not found`
            );
          }

          // Check if we have enough quantity available
          if (currentInventory.quantity < inventory.quantityTaken) {
            throw new Error(
              `Insufficient stock available. Lot ${inventory.lotNumber} has ${currentInventory.quantity} available but ${inventory.quantityTaken} was requested. Please refresh and try again.`
            );
          }

          totalQuantityTakenForProduct += inventory.quantityTaken;

          // Prepare inventory update (aggregate quantities)
          const existingUpdate = inventoryUpdatesMap.get(
            inventory.inventoryStockId
          );
          inventoryUpdatesMap.set(inventory.inventoryStockId, {
            quantityReduction:
              (existingUpdate?.quantityReduction || 0) +
              inventory.quantityTaken,
            currentQuantity: currentInventory.quantity, // Store original for transaction logging
          });

          // Prepare inventory transaction
          inventoryTransactionsData.push({
            inventoryId: inventory.inventoryStockId,
            productId: product.productId,
            storeId: waybill.storeId,
            userId: userId,
            transactionType:
              waybillType === WaybillType.Sale
                ? ("sale" as InventoryTransactionType)
                : ("loan" as InventoryTransactionType),
            quantityBefore: currentInventory.quantity,
            quantityAfter: currentInventory.quantity - inventory.quantityTaken,
            transactionDate: new Date(),
            notes: `Stock reduced for new waybill (type: ${waybillType})`,
            referenceId: newWaybill.id,
          });

          // Store the inventory data with a placeholder waybillItemId for now
          waybillItemInventoryData.push({
            productIndex: currentWaybillItemIndex, // Reference to product index in waybillItemsData
            inventory: {
              inventoryStockId: inventory.inventoryStockId,
              lotNumber: inventory.lotNumber,
              quantityTaken: inventory.quantityTaken,
              unitPrice: inventory.unitPrice,
            },
          });
        }

        // Prepare product quantity update
        const existingProductUpdate = productUpdatesMap.get(product.productId);
        productUpdatesMap.set(product.productId, {
          quantityReduction:
            (existingProductUpdate?.quantityReduction || 0) +
            totalQuantityTakenForProduct,
        });

        // Prepare sale item fulfillment update
        if (waybillType === WaybillType.Sale && product.saleItemId) {
          const existingSaleUpdate = saleItemUpdatesMap.get(product.saleItemId);
          saleItemUpdatesMap.set(product.saleItemId, {
            quantityIncrease:
              (existingSaleUpdate?.quantityIncrease || 0) +
              totalQuantityTakenForProduct,
          });
        }
      }

      // 3. Batch insert waybill items
      let insertedWaybillItems: (typeof waybillItemsTable.$inferSelect)[] = [];
      if (waybillItemsData.length > 0) {
        insertedWaybillItems = await tx
          .insert(waybillItemsTable)
          .values(waybillItemsData)
          .returning();
      }

      // 4. Prepare waybill item inventory data with actual waybill item IDs
      const finalWaybillItemInventoryData: (typeof waybillItemInventoryTable.$inferInsert)[] =
        [];
      for (const invData of waybillItemInventoryData) {
        const waybillItemId = insertedWaybillItems[invData.productIndex].id;
        finalWaybillItemInventoryData.push({
          waybillItemId: waybillItemId,
          ...invData.inventory,
        });
      }

      // 5. Batch insert waybill item inventory
      if (finalWaybillItemInventoryData.length > 0) {
        await tx
          .insert(waybillItemInventoryTable)
          .values(finalWaybillItemInventoryData);
      }

      // 6. Batch update inventory quantities
      const inventoryUpdatePromises = Array.from(
        inventoryUpdatesMap.entries()
      ).map(([id, { quantityReduction }]) =>
        tx
          .update(inventoryTable)
          .set({
            quantity: sql`${inventoryTable.quantity} - ${quantityReduction}`,
          })
          .where(eq(inventoryTable.id, id))
      );
      await Promise.all(inventoryUpdatePromises);

      // 7. Batch insert inventory transactions
      if (inventoryTransactionsData.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(inventoryTransactionsData);
      }

      // 9. Batch update sale item fulfillment
      const saleItemUpdatePromises = Array.from(
        saleItemUpdatesMap.entries()
      ).map(([id, { quantityIncrease }]) =>
        tx
          .update(saleItemsTable)
          .set({
            fulfilledQuantity: sql`${saleItemsTable.fulfilledQuantity} + ${quantityIncrease}`,
          })
          .where(eq(saleItemsTable.id, id))
      );
      await Promise.all(saleItemUpdatePromises);

      // 10. Check if sale is fully fulfilled (only for sale waybills)
      if (waybillType === WaybillType.Sale && waybill.saleId) {
        const saleItems = await tx
          .select({
            quantity: saleItemsTable.quantity,
            fulfilledQuantity: saleItemsTable.fulfilledQuantity,
          })
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, waybill.saleId));

        const isFullyFulfilled = saleItems.every(
          (item) => item.quantity <= item.fulfilledQuantity
        );

        // Mark sale as completed if fully fulfilled
        if (isFullyFulfilled) {
          await tx
            .update(salesTable)
            .set({ status: "completed" })
            .where(eq(salesTable.id, waybill.saleId));
        }
      }

      // 8. If there's an associated sale, update the promissory note
      if (newWaybill.saleId) {
        // Collect the necessary product information from the waybill items
        const waybillProductsForPromissoryNote = insertedWaybillItems.map(
          (item) => ({
            productId: item.productId,
            productID: item.productID ?? "",
            quantitySupplied: item.quantitySupplied, // Use quantitySupplied from the inserted item
          })
        );
        await updatePromissoryNoteForWaybill(
          tx,
          newWaybill.saleId,
          waybillProductsForPromissoryNote
        );
      }

      return { waybill: newWaybill, items: insertedWaybillItems };
    });

    revalidatePath("/waybills");
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating waybill:", error);
    throw error;
  }
};

// Get Waybill by ID
export const getWaybillById = async (waybillId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main waybill record
      const waybill = await tx
        .select({
          waybill: waybillsTable,
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(waybillsTable)
        .leftJoin(salesTable, eq(waybillsTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(waybillsTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(waybillsTable.storeId, storesTable.id))
        .where(
          and(eq(waybillsTable.id, waybillId), eq(waybillsTable.isActive, true))
        )
        .then((res) => res[0]);

      if (!waybill) return null;

      // Get all items for this waybill
      const items = await tx
        .select()
        .from(waybillItemsTable)
        .where(
          and(
            eq(waybillItemsTable.waybillId, waybillId),
            eq(waybillItemsTable.isActive, true)
          )
        );

      // Get all inventory records for these waybill items
      const waybillItemIds = items.map((item) => item.id);
      const inventoryRecords =
        waybillItemIds.length > 0
          ? await tx
              .select()
              .from(waybillItemInventoryTable)
              .where(
                and(
                  inArray(
                    waybillItemInventoryTable.waybillItemId,
                    waybillItemIds
                  ),
                  eq(waybillItemInventoryTable.isActive, true)
                )
              )
          : [];

      // Create a map of waybill item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        if (!inventoryMap.has(record.waybillItemId)) {
          inventoryMap.set(record.waybillItemId, []);
        }
        inventoryMap.get(record.waybillItemId).push(record);
      });

      return {
        ...waybill,
        products: items.map((item) => ({
          ...item,
          inventoryStock: inventoryMap.get(item.id) || [],
        })),
      };
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting waybill:", error);
    throw error;
  }
};

// Get all waybills with pagination
export const getWaybills = async (
  page: number = 0,
  limit: number = 10,
  getAllWaybills: boolean = false,
  filters?: WaybillFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create base query
      let waybillsQuery = tx
        .select({
          waybill: waybillsTable,
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(waybillsTable)
        .leftJoin(salesTable, eq(waybillsTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(waybillsTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(waybillsTable.storeId, storesTable.id))
        .$dynamic();

      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        waybillsQuery = waybillsQuery.where(and(...conditions));
      }

      waybillsQuery = waybillsQuery.orderBy(desc(waybillsTable.createdAt));

      if (!getAllWaybills && limit > 0) {
        waybillsQuery = waybillsQuery.limit(limit).offset(page * limit);
      }

      const waybills = await waybillsQuery;

      // Get all products for these wybills in a single query
      const waybillIds = waybills.map((bill) => bill.waybill.id);
      const items =
        waybillIds.length > 0
          ? await tx
              .select()
              .from(waybillItemsTable)
              .where(
                and(
                  inArray(waybillItemsTable.waybillId, waybillIds),
                  eq(waybillItemsTable.isActive, true)
                )
              )
          : [];

      // Get all inventory records for these waybill items
      const waybillItemIds = items.map((item) => item.id);
      const inventoryRecords =
        waybillItemIds.length > 0
          ? await tx
              .select()
              .from(waybillItemInventoryTable)
              .where(
                and(
                  inArray(
                    waybillItemInventoryTable.waybillItemId,
                    waybillItemIds
                  ),
                  eq(waybillItemInventoryTable.isActive, true)
                )
              )
          : [];

      // Create a map of waybill item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        if (!inventoryMap.has(record.waybillItemId)) {
          inventoryMap.set(record.waybillItemId, []);
        }
        inventoryMap.get(record.waybillItemId).push(record);
      });

      const waybillsWithItems = waybills.map((bill) => ({
        ...bill,
        products: items
          .filter((item) => item.waybillId === bill.waybill.id)
          .map((item) => ({
            ...item,
            inventoryStock: inventoryMap.get(item.id) || [],
          })),
      }));

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(waybillsTable)
        .leftJoin(salesTable, eq(waybillsTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(waybillsTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(waybillsTable.storeId, storesTable.id))
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllWaybills
        ? waybills.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: waybillsWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting waybills:", error);
    throw error;
  }
};

// Edit waybill
export const editWaybill = async (
  waybill: WaybillFormValues,
  waybillId: string,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const waybillType =
        waybill.saleId && !waybill.isLoanWaybill
          ? WaybillType.Sale
          : WaybillType.Loan;

      if (!userId) {
        throw new Error("User not found");
      }

      // 1. Get the existing waybill
      const [existingWaybill] = await tx
        .select()
        .from(waybillsTable)
        .where(eq(waybillsTable.id, waybillId));

      if (!existingWaybill) {
        throw new Error("Waybill not found");
      }

      // --- START: Capture previous waybill products for Promissory Note reconciliation ---
      let previousWaybillProductsForPN: WaybillProductForPromissoryNote[] = [];
      if (existingWaybill.saleId) {
        // Only if the existing waybill was tied to a sale
        const previousWaybillItems = await tx
          .select({
            productId: waybillItemsTable.productId,
            productID: waybillItemsTable.productID ?? "",
            quantitySupplied: waybillItemsTable.quantitySupplied,
          })
          .from(waybillItemsTable)
          .where(eq(waybillItemsTable.waybillId, waybillId));

        // Aggregate quantities if the same product ID appears multiple times
        const aggregatedPreviousProducts = new Map<
          string,
          WaybillProductForPromissoryNote
        >();
        previousWaybillItems.forEach((item) => {
          const key = `${item.productId}_${item.productID}`;
          const existing = aggregatedPreviousProducts.get(key);
          if (existing) {
            existing.quantitySupplied += item.quantitySupplied;
          } else {
            // Ensure productID is always a string to satisfy WaybillProductForPromissoryNote
            aggregatedPreviousProducts.set(key, {
              productId: item.productId,
              productID: (item.productID ?? "") as string,
              quantitySupplied: item.quantitySupplied,
            });
          }
        });
        previousWaybillProductsForPN = Array.from(
          aggregatedPreviousProducts.values()
        );
      }
      // --- END: Capture previous waybill products ---

      // 2. Batch validate sale items and sale existence upfront
      const saleItemIds = waybill.products
        .map((p) => p.saleItemId)
        .filter(Boolean);

      if (saleItemIds.length > 0) {
        const existingSaleItems = await tx
          .select({ id: saleItemsTable.id })
          .from(saleItemsTable)
          .where(inArray(saleItemsTable.id, saleItemIds));

        const foundSaleItemIds = existingSaleItems.map((item) => item.id);
        const missingSaleItemIds = saleItemIds.filter(
          (id) => !foundSaleItemIds.includes(id)
        );

        if (missingSaleItemIds.length > 0) {
          throw new Error(
            `The following sale items no longer exist: ${missingSaleItemIds.join(
              ", "
            )}. Please refresh the page and try again.`
          );
        }
      }

      if (waybill.saleId) {
        const saleExists = await tx
          .select({ id: salesTable.id })
          .from(salesTable)
          .where(eq(salesTable.id, waybill.saleId))
          .then((res) => res.length > 0);

        if (!saleExists) {
          throw new Error(
            "Associated sale no longer exists. Please refresh the page and try again."
          );
        }
      }

      // 3. Get existing waybill items and their inventory in batch
      const existingItems = await tx
        .select()
        .from(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      const existingItemIds = existingItems.map((item) => item.id);
      const existingInventoryRecords =
        existingItemIds.length > 0
          ? await tx
              .select({
                waybillInv: waybillItemInventoryTable,
                waybillItem: waybillItemsTable,
              })
              .from(waybillItemInventoryTable)
              .leftJoin(
                waybillItemsTable,
                eq(
                  waybillItemInventoryTable.waybillItemId,
                  waybillItemsTable.id
                )
              )
              .where(
                inArray(
                  waybillItemInventoryTable.waybillItemId,
                  existingItemIds
                )
              )
          : [];

      // Prepare batch restoration data structures
      const inventoryRestoreUpdatesMap = new Map<
        string,
        { quantityRestore: number; currentQuantity: number }
      >();
      const productRestoreUpdatesMap = new Map<
        string,
        { quantityRestore: number }
      >();
      const saleItemReductionsMap = new Map<
        string,
        { quantityReduction: number }
      >();
      const reversalTransactionsData: (typeof inventoryTransactionsTable.$inferInsert)[] =
        [];

      // Collect inventory IDs for batch fetching for current state
      const inventoryIdsForRestore = existingInventoryRecords.map(
        (inv) => inv.waybillInv.inventoryStockId
      );
      const currentInventories =
        inventoryIdsForRestore.length > 0
          ? await tx
              .select()
              .from(inventoryTable)
              .where(inArray(inventoryTable.id, inventoryIdsForRestore))
          : [];

      const currentInventoryMapForRestore = new Map(
        currentInventories.map((inv) => [inv.id, inv])
      );

      // 4. Process existing inventory for restoration
      for (const invRecord of existingInventoryRecords) {
        if (!invRecord.waybillItem) {
          console.warn(
            `Waybill item not found for inventory record ${invRecord.waybillInv.id}`
          );
          continue;
        }

        const currentInventory = currentInventoryMapForRestore.get(
          invRecord.waybillInv.inventoryStockId
        );
        if (!currentInventory) continue; // Should not happen if pre-fetched correctly

        // Aggregate inventory restoration
        const existingUpdate = inventoryRestoreUpdatesMap.get(
          invRecord.waybillInv.inventoryStockId
        );
        inventoryRestoreUpdatesMap.set(invRecord.waybillInv.inventoryStockId, {
          quantityRestore:
            (existingUpdate?.quantityRestore || 0) +
            invRecord.waybillInv.quantityTaken,
          currentQuantity: currentInventory.quantity, // Store original for transaction logging
        });

        // Aggregate product restoration (for loan waybills)
        if (waybillType === WaybillType.Loan) {
          const existingProductUpdate = productRestoreUpdatesMap.get(
            invRecord.waybillItem.productId
          );
          productRestoreUpdatesMap.set(invRecord.waybillItem.productId, {
            quantityRestore:
              (existingProductUpdate?.quantityRestore || 0) +
              invRecord.waybillInv.quantityTaken,
          });
        }

        // Aggregate sale item fulfillment reduction
        if (invRecord.waybillItem.saleItemId) {
          const existingSaleUpdate = saleItemReductionsMap.get(
            invRecord.waybillItem.saleItemId
          );
          saleItemReductionsMap.set(invRecord.waybillItem.saleItemId, {
            quantityReduction:
              (existingSaleUpdate?.quantityReduction || 0) +
              invRecord.waybillInv.quantityTaken,
          });
        }

        // Prepare reversal transaction
        reversalTransactionsData.push({
          inventoryId: invRecord.waybillInv.inventoryStockId,
          productId: invRecord.waybillItem.productId,
          storeId: existingWaybill.storeId,
          userId: userId,
          transactionType: "waybill_edit_reversal" as InventoryTransactionType,
          quantityBefore: currentInventory.quantity,
          quantityAfter:
            currentInventory.quantity + invRecord.waybillInv.quantityTaken,
          transactionDate: new Date(),
          notes: `Stock returned during waybill edit for ${existingWaybill.waybillRefNumber}`,
          referenceId: existingWaybill.id,
        });
      }

      // 5. Batch restore inventory quantities
      const inventoryRestorePromises = Array.from(
        inventoryRestoreUpdatesMap.entries()
      ).map(([id, { quantityRestore }]) =>
        tx
          .update(inventoryTable)
          .set({
            quantity: sql`${inventoryTable.quantity} + ${quantityRestore}`,
          })
          .where(eq(inventoryTable.id, id))
      );
      await Promise.all(inventoryRestorePromises);

      //  Batch reduce sale item fulfillment
      const saleItemReductionPromises = Array.from(
        saleItemReductionsMap.entries()
      ).map(([id, { quantityReduction }]) =>
        tx
          .update(saleItemsTable)
          .set({
            fulfilledQuantity: sql`GREATEST(0, ${saleItemsTable.fulfilledQuantity} - ${quantityReduction})`,
          })
          .where(eq(saleItemsTable.id, id))
      );
      await Promise.all(saleItemReductionPromises);

      // Batch insert reversal transactions
      if (reversalTransactionsData.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(reversalTransactionsData);
      }

      // Delete existing records (old waybill items and their inventory)
      if (existingItemIds.length > 0) {
        await tx
          .delete(waybillItemInventoryTable)
          .where(
            inArray(waybillItemInventoryTable.waybillItemId, existingItemIds)
          );
        await tx
          .delete(waybillItemsTable)
          .where(eq(waybillItemsTable.waybillId, waybillId));
      }

      // Update main waybill record
      const [updatedWaybill] = await tx
        .update(waybillsTable)
        .set({
          waybillDate: waybill.waybillDate,
          waybillRefNumber: waybill.waybillRefNumber,
          status: waybill.status as DeliveryStatus,
          deliveryAddress: waybill.deliveryAddress
            ? {
                addressName: waybill.deliveryAddress.addressName || "",
                address: waybill.deliveryAddress.address || "",
                city: waybill.deliveryAddress.city || "",
                state: waybill.deliveryAddress.state || "",
                country: waybill.deliveryAddress.country || "",
                email: waybill.deliveryAddress.email || "",
                phone: waybill.deliveryAddress.phone || "",
              }
            : null,
          customerId: waybill.customerId,
          storeId: waybill.storeId,
          saleId: waybill.saleId ? waybill.saleId : null,
          waybillType: waybillType,
          deliveredBy: waybill.deliveredBy,
          receivedBy: waybill.receivedBy,
          notes: waybill.notes,
          conversionStatus:
            waybillType === WaybillType.Loan
              ? WaybillConversionStatus.Pending
              : null, // Reset or maintain as per business logic
        })
        .where(eq(waybillsTable.id, waybillId))
        .returning();

      // Now re-create the waybill items and related records using optimized batch approach

      const newWaybillItemsData: (typeof waybillItemsTable.$inferInsert)[] = [];
      const newWaybillItemInventoryData: Array<{
        productIndex: number;
        inventory: Omit<
          typeof waybillItemInventoryTable.$inferInsert,
          "waybillItemId"
        >;
      }> = [];
      const newInventoryUpdatesMap = new Map<
        string,
        { quantityReduction: number; currentQuantity: number }
      >();
      const newInventoryTransactionsData: (typeof inventoryTransactionsTable.$inferInsert)[] =
        [];
      const newProductUpdatesMap = new Map<
        string,
        { quantityReduction: number }
      >();
      const newSaleItemUpdatesMap = new Map<
        string,
        { quantityIncrease: number }
      >();

      // Collect all new inventory IDs for pre-fetching
      const newAllInventoryIds = waybill.products.flatMap(
        (product) =>
          product.inventoryStock?.map((inv) => inv.inventoryStockId) || []
      );

      // Batch fetch all required inventory records for new data
      const newInventoryRecords =
        newAllInventoryIds.length > 0
          ? await tx
              .select()
              .from(inventoryTable)
              .where(inArray(inventoryTable.id, newAllInventoryIds))
          : [];

      const newInventoryMap = new Map(
        newInventoryRecords.map((inv) => [inv.id, inv])
      );

      // Process each new product
      for (const product of waybill.products) {
        if (!product.productId) {
          throw new Error("Invalid product data: missing productId");
        }
        if (waybillType === WaybillType.Sale && !product.saleItemId) {
          throw new Error(
            "Invalid product data: missing saleItemId for sale waybill"
          );
        }

        const newWaybillItemData: typeof waybillItemsTable.$inferInsert = {
          waybillId: updatedWaybill.id,
          productId: product.productId,
          saleItemId:
            waybillType === WaybillType.Sale ? product.saleItemId : null,
          quantityRequested: product.quantityRequested,
          quantitySupplied: product.quantitySupplied,
          balanceLeft: product.balanceLeft,
          fulfilledQuantity: product.fulfilledQuantity,
          productName: product.productName,
          productID: product.productID,
          quantityConverted: product.quantityConverted,
        };
        newWaybillItemsData.push(newWaybillItemData);
        const currentNewWaybillItemIndex = newWaybillItemsData.length - 1;

        if (product.inventoryStock && product.inventoryStock.length > 0) {
          let totalQuantityTakenForNewProduct = 0;

          for (const inventory of product.inventoryStock) {
            if (
              !inventory.inventoryStockId ||
              !inventory.quantityTaken ||
              inventory.quantityTaken <= 0
            ) {
              console.warn("Invalid inventory data:", inventory);
              continue;
            }

            const currentInventory = newInventoryMap.get(
              inventory.inventoryStockId
            );
            if (!currentInventory) {
              throw new Error(
                `Inventory stock with ID ${inventory.inventoryStockId} not found`
              );
            }

            if (currentInventory.quantity < inventory.quantityTaken) {
              throw new Error(
                `Insufficient stock available. Lot ${inventory.lotNumber} has ${currentInventory.quantity} available but ${inventory.quantityTaken} was requested. Please refresh and try again.`
              );
            }

            totalQuantityTakenForNewProduct += inventory.quantityTaken;

            // Aggregate new inventory updates
            const existingUpdate = newInventoryUpdatesMap.get(
              inventory.inventoryStockId
            );
            newInventoryUpdatesMap.set(inventory.inventoryStockId, {
              quantityReduction:
                (existingUpdate?.quantityReduction || 0) +
                inventory.quantityTaken,
              currentQuantity: currentInventory.quantity,
            });

            // Prepare new inventory transactions
            newInventoryTransactionsData.push({
              inventoryId: inventory.inventoryStockId,
              productId: product.productId,
              storeId: waybill.storeId,
              userId: userId,
              transactionType: "waybill_edit" as InventoryTransactionType,
              quantityBefore: currentInventory.quantity,
              quantityAfter:
                currentInventory.quantity - inventory.quantityTaken,
              transactionDate: new Date(),
              notes: `Stock reduced for waybill edit for ${updatedWaybill.waybillRefNumber}`,
              referenceId: updatedWaybill.id,
            });

            // Store inventory data with placeholder
            newWaybillItemInventoryData.push({
              productIndex: currentNewWaybillItemIndex,
              inventory: {
                inventoryStockId: inventory.inventoryStockId,
                lotNumber: inventory.lotNumber,
                quantityTaken: inventory.quantityTaken,
                unitPrice: inventory.unitPrice,
              },
            });
          }

          // Prepare new product updates (only for loan waybills, sale products don't reduce overall stock)
          if (waybillType === WaybillType.Loan) {
            const existingProductUpdate = newProductUpdatesMap.get(
              product.productId
            );
            newProductUpdatesMap.set(product.productId, {
              quantityReduction:
                (existingProductUpdate?.quantityReduction || 0) +
                totalQuantityTakenForNewProduct,
            });
          }

          // Prepare new sale item updates
          if (waybillType === WaybillType.Sale && product.saleItemId) {
            const existingSaleUpdate = newSaleItemUpdatesMap.get(
              product.saleItemId
            );
            newSaleItemUpdatesMap.set(product.saleItemId, {
              quantityIncrease:
                (existingSaleUpdate?.quantityIncrease || 0) +
                totalQuantityTakenForNewProduct,
            });
          }
        }
      }

      // 12. Batch insert new waybill items
      let insertedNewWaybillItems: (typeof waybillItemsTable.$inferSelect)[] =
        [];
      if (newWaybillItemsData.length > 0) {
        insertedNewWaybillItems = await tx
          .insert(waybillItemsTable)
          .values(newWaybillItemsData)
          .returning();
      }

      // 13. Prepare new waybill item inventory data with actual IDs
      const finalNewWaybillItemInventoryData: (typeof waybillItemInventoryTable.$inferInsert)[] =
        [];
      for (const invData of newWaybillItemInventoryData) {
        const waybillItemId = insertedNewWaybillItems[invData.productIndex].id;
        finalNewWaybillItemInventoryData.push({
          waybillItemId: waybillItemId,
          ...invData.inventory,
        });
      }

      // 14. Batch insert new waybill item inventory
      if (finalNewWaybillItemInventoryData.length > 0) {
        await tx
          .insert(waybillItemInventoryTable)
          .values(finalNewWaybillItemInventoryData);
      }

      // 15. Batch update new inventory quantities
      const newInventoryUpdatePromises = Array.from(
        newInventoryUpdatesMap.entries()
      ).map(([id, { quantityReduction }]) =>
        tx
          .update(inventoryTable)
          .set({
            quantity: sql`${inventoryTable.quantity} - ${quantityReduction}`,
          })
          .where(eq(inventoryTable.id, id))
      );
      await Promise.all(newInventoryUpdatePromises);

      // 16. Batch insert new inventory transactions
      if (newInventoryTransactionsData.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(newInventoryTransactionsData);
      }

      // 18. Batch update new sale item fulfillment
      const newSaleItemUpdatePromises = Array.from(
        newSaleItemUpdatesMap.entries()
      ).map(([id, { quantityIncrease }]) =>
        tx
          .update(saleItemsTable)
          .set({
            fulfilledQuantity: sql`${saleItemsTable.fulfilledQuantity} + ${quantityIncrease}`,
          })
          .where(eq(saleItemsTable.id, id))
      );
      await Promise.all(newSaleItemUpdatePromises);

      // --- START: Integrate updatePromissoryNoteForWaybillEdit here ---
      if (updatedWaybill.saleId) {
        // Only if the updated waybill is tied to a sale
        const newWaybillProductsForPN: WaybillProductForPromissoryNote[] =
          waybill.products.map((product) => ({
            productId: product.productId,
            productID: product.productID,
            quantitySupplied: product.quantitySupplied,
          }));

        await updatePromissoryNoteForWaybillEdit(
          tx,
          updatedWaybill.saleId,
          previousWaybillProductsForPN,
          newWaybillProductsForPN
        );
      }
      // --- END: Integrate updatePromissoryNoteForWaybillEdit here ---

      // 19. Recalculate sale fulfillment status (only for sale waybills)
      if (waybillType === WaybillType.Sale && waybill.saleId) {
        const saleItems = await tx
          .select({
            quantity: saleItemsTable.quantity,
            fulfilledQuantity: saleItemsTable.fulfilledQuantity,
          })
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, waybill.saleId));

        const isFullyFulfilled = saleItems.every(
          (item) => item.quantity <= item.fulfilledQuantity
        );

        if (isFullyFulfilled) {
          await tx
            .update(salesTable)
            .set({ status: "completed" })
            .where(eq(salesTable.id, waybill.saleId));
        } else {
          await tx
            .update(salesTable)
            .set({ status: "pending" })
            .where(
              and(
                eq(salesTable.id, waybill.saleId),
                eq(salesTable.status, "completed") // Only revert if it was completed
              )
            );
        }
      }

      return { waybill: updatedWaybill, items: insertedNewWaybillItems };
    });

    revalidatePath("/waybills");
    revalidatePath(`/waybills/edit-waybill/${waybillId}`);
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error editing waybill:", error);
    throw error;
  }
};

// Permanently delete Waybill
export const deleteWaybill = async (waybillId: string, userId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the waybill details first
      const [waybill] = await tx
        .select()
        .from(waybillsTable)
        .where(eq(waybillsTable.id, waybillId))
        .limit(1);

      if (!waybill) {
        throw new Error("Waybill not found");
      }

      // Get waybill items
      const waybillItems = await tx
        .select()
        .from(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      // Delete waybill item inventory records
      const waybillItemIds = waybillItems.map((item) => item.id);

      // Get inventory records to restore stock
      const inventoryRecords =
        waybillItemIds.length > 0
          ? await tx
              .select({
                waybillInv: waybillItemInventoryTable,
                waybillItem: waybillItemsTable,
              })
              .from(waybillItemInventoryTable)
              .leftJoin(
                waybillItemsTable,
                eq(
                  waybillItemInventoryTable.waybillItemId,
                  waybillItemsTable.id
                )
              )
              .where(
                inArray(waybillItemInventoryTable.waybillItemId, waybillItemIds)
              )
          : [];

      // Restore inventory quantities and log transactions
      for (const invRecord of inventoryRecords) {
        if (!invRecord.waybillItem) continue;

        // Get current inventory for logging
        const [currentInventory] = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.id, invRecord.waybillInv.inventoryStockId))
          .limit(1);

        if (currentInventory) {
          // Restore inventory quantity
          const [restoredInventory] = await tx
            .update(inventoryTable)
            .set({
              quantity: sql`${inventoryTable.quantity} + ${invRecord.waybillInv.quantityTaken}`,
            })
            .where(eq(inventoryTable.id, invRecord.waybillInv.inventoryStockId))
            .returning();

          // Log the restoration transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: invRecord.waybillInv.inventoryStockId,
            productId: invRecord.waybillItem.productId,
            storeId: waybill.storeId,
            userId: userId,
            transactionType: "waybill_deletion_restore",
            quantityBefore: currentInventory.quantity,
            quantityAfter: restoredInventory.quantity,
            transactionDate: new Date(),
            notes: `Stock restored from deleted waybill ${waybill.waybillRefNumber}`,
            referenceId: waybillId,
          });

          // Update sale item fulfillment if applicable
          if (invRecord.waybillItem.saleItemId) {
            await tx
              .update(saleItemsTable)
              .set({
                fulfilledQuantity: sql`GREATEST(0, ${saleItemsTable.fulfilledQuantity} - ${invRecord.waybillInv.quantityTaken})`,
              })
              .where(eq(saleItemsTable.id, invRecord.waybillItem.saleItemId));
          }
        }
      }

      if (waybillItemIds.length > 0) {
        await tx
          .delete(waybillItemInventoryTable)
          .where(
            inArray(waybillItemInventoryTable.waybillItemId, waybillItemIds)
          );
      }

      // Delete waybill items
      await tx
        .delete(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      // Update sale status if this was a sale waybill
      if (waybill.saleId && waybill.waybillType === WaybillType.Sale) {
        const saleItems = await tx
          .select()
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, waybill.saleId));

        const isFullyFulfilled = saleItems.every(
          (item) => item.quantity <= item.fulfilledQuantity
        );

        // Update sale status based on fulfillment
        await tx
          .update(salesTable)
          .set({ status: isFullyFulfilled ? "completed" : "pending" })
          .where(eq(salesTable.id, waybill.saleId));
      }

      // Delete the main waybill record
      const [deletedWaybill] = await tx
        .delete(waybillsTable)
        .where(eq(waybillsTable.id, waybillId))
        .returning();

      return deletedWaybill;
    });

    revalidatePath("/waybills");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting waybill:", error);
    throw error;
  }
};

// Soft delete waybill
export const softDeleteWaybill = async (waybillId: string, userId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the waybill details first
      const [waybill] = await tx
        .select()
        .from(waybillsTable)
        .where(eq(waybillsTable.id, waybillId))
        .limit(1);

      if (!waybill) {
        throw new Error("Waybill not found");
      }

      // Soft delete waybill items and their inventory
      const waybillItems = await tx
        .update(waybillItemsTable)
        .set({ isActive: false })
        .where(eq(waybillItemsTable.waybillId, waybillId))
        .returning();

      const waybillItemIds = waybillItems.map((item) => item.id);

      // Get inventory records to restore stock
      const inventoryRecords =
        waybillItemIds.length > 0
          ? await tx
              .select({
                waybillInv: waybillItemInventoryTable,
                waybillItem: waybillItemsTable,
              })
              .from(waybillItemInventoryTable)
              .leftJoin(
                waybillItemsTable,
                eq(
                  waybillItemInventoryTable.waybillItemId,
                  waybillItemsTable.id
                )
              )
              .where(
                inArray(waybillItemInventoryTable.waybillItemId, waybillItemIds)
              )
          : [];

      // Restore inventory quantities and log transactions
      for (const invRecord of inventoryRecords) {
        if (!invRecord.waybillItem) continue;

        // Get current inventory for logging
        const [currentInventory] = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.id, invRecord.waybillInv.inventoryStockId))
          .limit(1);

        if (currentInventory) {
          // Restore inventory quantity
          const [restoredInventory] = await tx
            .update(inventoryTable)
            .set({
              quantity: sql`${inventoryTable.quantity} + ${invRecord.waybillInv.quantityTaken}`,
            })
            .where(eq(inventoryTable.id, invRecord.waybillInv.inventoryStockId))
            .returning();

          // Log the restoration transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: invRecord.waybillInv.inventoryStockId,
            productId: invRecord.waybillItem.productId,
            storeId: waybill.storeId,
            userId: userId,
            transactionType: "waybill_deletion_restore",
            quantityBefore: currentInventory.quantity,
            quantityAfter: restoredInventory.quantity,
            transactionDate: new Date(),
            notes: `Stock restored from soft deleted waybill ${waybill.waybillRefNumber}`,
            referenceId: waybillId,
          });

          // Update sale item fulfillment if applicable
          if (invRecord.waybillItem.saleItemId) {
            await tx
              .update(saleItemsTable)
              .set({
                fulfilledQuantity: sql`GREATEST(0, ${saleItemsTable.fulfilledQuantity} - ${invRecord.waybillInv.quantityTaken})`,
              })
              .where(eq(saleItemsTable.id, invRecord.waybillItem.saleItemId));
          }
        }
      }

      if (waybillItemIds.length > 0) {
        await tx
          .update(waybillItemInventoryTable)
          .set({ isActive: false })
          .where(
            inArray(waybillItemInventoryTable.waybillItemId, waybillItemIds)
          );
      }

      // update waybill items
      await tx
        .update(waybillItemsTable)
        .set({ isActive: false })
        .where(eq(waybillItemsTable.waybillId, waybillId));

      // Update sale status if this was a sale waybill
      if (waybill.saleId && waybill.waybillType === WaybillType.Sale) {
        const saleItems = await tx
          .select()
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, waybill.saleId));

        const isFullyFulfilled = saleItems.every(
          (item) => item.quantity <= item.fulfilledQuantity
        );

        // Update sale status based on fulfillment
        await tx
          .update(salesTable)
          .set({ status: isFullyFulfilled ? "completed" : "pending" })
          .where(eq(salesTable.id, waybill.saleId));
      }

      // Soft delete main waybill record
      const [updatedWaybill] = await tx
        .update(waybillsTable)
        .set({ isActive: false })
        .where(eq(waybillsTable.id, waybillId))
        .returning();

      return updatedWaybill;
    });

    revalidatePath("/waybills");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting waybill:", error);
    throw error;
  }
};

// Generate waybill reference number
export const generateWaybillRefNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastWaybill = await tx
        .select({ waybillRefNumber: waybillsTable.waybillRefNumber })
        .from(waybillsTable)
        .where(sql`waybill_ref_number LIKE ${`WB${year}/${month}/%`}`)
        .orderBy(desc(waybillsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastWaybill.length > 0) {
        const lastRefNumber = lastWaybill[0].waybillRefNumber;
        const lastSequence = parseInt(
          lastRefNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");
      return `WB${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating waybill reference number:", error);
    throw error;
  }
};

// Convert loan waybill
export const convertLoanWaybill = async (
  data: ConvertLoanWaybillFormValues,
  loanWaybillId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const [loanWaybill] = await tx
        .select()
        .from(waybillsTable)
        .where(
          and(
            eq(waybillsTable.id, loanWaybillId),
            eq(waybillsTable.waybillType, WaybillType.Loan)
          )
        )
        .limit(1);

      if (!loanWaybill) {
        throw new Error("Loan waybill not found or not a loan waybill");
      }

      const [sale] = await tx
        .select()
        .from(salesTable)
        .where(eq(salesTable.id, data.saleId))
        .limit(1);

      if (!sale) {
        throw new Error("Sale not found");
      }

      const newWaybillRefNumber = await generateWaybillRefNumber();
      if (!newWaybillRefNumber) {
        throw new Error("Failed to generate waybill reference number");
      }

      // Create new waybill record
      const [newWaybill] = await tx
        .insert(waybillsTable)
        .values({
          waybillDate: new Date(),
          waybillRefNumber: newWaybillRefNumber,
          status: DeliveryStatus.Delivered,
          deliveryAddress: loanWaybill.deliveryAddress
            ? {
                addressName: loanWaybill.deliveryAddress.addressName || "",
                address: loanWaybill.deliveryAddress.address || "",
                city: loanWaybill.deliveryAddress.city || "",
                state: loanWaybill.deliveryAddress.state || "",
                country: loanWaybill.deliveryAddress.country || "",
                email: loanWaybill.deliveryAddress.email || "",
                phone: loanWaybill.deliveryAddress.phone || "",
              }
            : null,
          customerId: data.customerId,
          storeId: data.storeId,
          saleId: data.saleId,
          waybillType: WaybillType.Conversion,
          originalLoanWaybillId: loanWaybill.id,
          isConverted: true,
          conversionStatus: WaybillConversionStatus.Full,
          conversionDate: data.conversionDate || new Date(),
          deliveredBy: loanWaybill.deliveredBy || "",
          receivedBy: loanWaybill.receivedBy || "",
          notes: data.notes,
        })
        .returning();

      const newLoanWaybillItems = [];
      const newWaybillItemInventoryInserts: (typeof waybillItemInventoryTable.$inferInsert)[] =
        [];

      // Get all loan waybill items and their associated inventory
      const loanWaybillItems = await tx
        .select()
        .from(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, loanWaybillId));

      // Fetch all inventory associated with the original loan waybill items
      const loanWaybillItemIds = loanWaybillItems.map((item) => item.id);
      const loanWaybillItemInventories =
        loanWaybillItemIds.length > 0
          ? await tx
              .select()
              .from(waybillItemInventoryTable)
              .where(
                inArray(
                  waybillItemInventoryTable.waybillItemId,
                  loanWaybillItemIds
                )
              )
          : [];

      // Create a map for quick lookup of inventory by waybillItemId
      const loanWaybillInventoryMap = new Map<
        string,
        (typeof waybillItemInventoryTable.$inferSelect)[]
      >();
      for (const inv of loanWaybillItemInventories) {
        if (!loanWaybillInventoryMap.has(inv.waybillItemId)) {
          loanWaybillInventoryMap.set(inv.waybillItemId, []);
        }
        loanWaybillInventoryMap.get(inv.waybillItemId)?.push(inv);
      }

      // Process each product to be converted
      for (const product of data.products) {
        const waybillItem = loanWaybillItems.find(
          (item) =>
            item.id === product.waybillItemId &&
            item.productId === product.productId &&
            item.productID === product.productID
        );

        if (!waybillItem) {
          console.warn(
            `Product ${product.productID} not found in loan waybill items`
          );
          continue;
        }

        // Create waybill item
        const [newWaybillItem] = await tx
          .insert(waybillItemsTable)
          .values({
            waybillId: newWaybill.id,
            productId: product.productId,
            saleItemId: product.saleItemId,
            quantityRequested: product.quantityToConvert,
            quantitySupplied: product.quantityToConvert,
            balanceLeft: 0,
            fulfilledQuantity: product.quantityToConvert,
            quantityConverted: product.quantityToConvert,
            productName: product.productName,
            productID: product.productID,
          })
          .returning();

        // **NEW LOGIC: Associate inventory from the original loan waybill item**
        const associatedLoanInventories =
          loanWaybillInventoryMap.get(waybillItem.id) || [];
        let remainingQuantityToConvert = product.quantityToConvert;

        for (const loanInv of associatedLoanInventories) {
          if (remainingQuantityToConvert <= 0) break;

          const quantityToTakeFromLoanInv = Math.min(
            remainingQuantityToConvert,
            loanInv.quantityTaken // Quantity originally taken for the loan
          );

          if (quantityToTakeFromLoanInv > 0) {
            newWaybillItemInventoryInserts.push({
              waybillItemId: newWaybillItem.id, // Link to the NEW conversion waybill item
              inventoryStockId: loanInv.inventoryStockId,
              lotNumber: loanInv.lotNumber,
              quantityTaken: quantityToTakeFromLoanInv, // The portion being converted
              unitPrice: loanInv.unitPrice,
            });
            remainingQuantityToConvert -= quantityToTakeFromLoanInv;
          }
        }

        // If there's still quantity to convert but no more associated loan inventory
        // (This scenario implies an inconsistency or partial conversion setup.
        // For now, we'll throw an error to ensure data integrity)
        if (remainingQuantityToConvert > 0) {
          throw new Error(
            `Could not find enough associated loan inventory for product ${product.productID} to match conversion quantity.`
          );
        }
        // END NEW LOGIC

        // Calculate new converted quantity
        const newConvertedQuantity =
          (waybillItem.quantityConverted || 0) + product.quantityToConvert;

        if (newConvertedQuantity > waybillItem.quantitySupplied) {
          throw new Error(
            `Cannot convert more than supplied quantity for product ${product.productID}`
          );
        }

        // Update the loan waybill item with converted quantity
        await tx
          .update(waybillItemsTable)
          .set({
            quantityConverted: newConvertedQuantity,
          })
          .where(eq(waybillItemsTable.id, waybillItem.id));

        // Get the sale item to check for backorder quantity
        const [saleItem] = await tx
          .select()
          .from(saleItemsTable)
          .where(eq(saleItemsTable.id, product.saleItemId))
          .limit(1);

        if (!saleItem) {
          throw new Error(`Sale item ${product.saleItemId} not found`);
        }

        // Handle backorder processing
        const hasBackorder =
          saleItem.hasBackorder && saleItem.backorderQuantity > 0;

        if (hasBackorder) {
          // Calculate how much backorder quantity to reduce
          const backorderReduction = Math.min(
            product.quantityToConvert,
            saleItem.backorderQuantity
          );

          const newBackorderQuantity = Math.max(
            0,
            saleItem.backorderQuantity - backorderReduction
          );
          const isBackorderCompletelyFulfilled = newBackorderQuantity === 0;

          // Update the sale item backorder quantity
          await tx
            .update(saleItemsTable)
            .set({
              backorderQuantity: newBackorderQuantity,
              fulfilledQuantity: sql`${saleItemsTable.fulfilledQuantity} + ${product.quantityToConvert}`,
              hasBackorder: !isBackorderCompletelyFulfilled,
            })
            .where(eq(saleItemsTable.id, product.saleItemId));

          // Update corresponding backorder records in backorders table
          const backorders = await tx
            .select()
            .from(backordersTable)
            .where(
              and(
                eq(backordersTable.saleItemId, product.saleItemId),
                eq(backordersTable.productId, product.productId),
                eq(backordersTable.storeId, data.storeId),
                eq(backordersTable.isActive, true)
              )
            )
            .orderBy(backordersTable.createdAt);

          let remainingReduction = backorderReduction;

          for (const backorder of backorders) {
            if (remainingReduction <= 0) break;

            const reductionAmount = Math.min(
              remainingReduction,
              backorder.pendingQuantity
            );

            if (reductionAmount > 0) {
              const newPendingQuantity = Math.max(
                0,
                backorder.pendingQuantity - reductionAmount
              );

              const isBackorderItemCompleted = newPendingQuantity === 0;

              await tx
                .update(backordersTable)
                .set({
                  pendingQuantity: newPendingQuantity,
                  isActive: !isBackorderItemCompleted,
                })
                .where(eq(backordersTable.id, backorder.id));

              remainingReduction -= reductionAmount;
            }
          }
        } else {
          // No backorder, just update fulfilled quantity
          await tx
            .update(saleItemsTable)
            .set({
              fulfilledQuantity: sql`${saleItemsTable.fulfilledQuantity} + ${product.quantityToConvert}`,
            })
            .where(eq(saleItemsTable.id, product.saleItemId));
        }

        newLoanWaybillItems.push(newWaybillItem);
      }

      // **NEW LOGIC: Insert the new waybill item inventory records**
      if (newWaybillItemInventoryInserts.length > 0) {
        await tx
          .insert(waybillItemInventoryTable)
          .values(newWaybillItemInventoryInserts);
      }
      // END NEW LOGIC

      // Update the loan waybill with sale information and conversion status
      const updatedLoanWaybillItems = await tx
        .select()
        .from(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, loanWaybillId));

      const isFullyConverted = updatedLoanWaybillItems.every(
        (item) => item.quantityConverted >= item.quantitySupplied
      );

      await tx
        .update(waybillsTable)
        .set({
          isConverted: isFullyConverted,
          conversionStatus: isFullyConverted
            ? WaybillConversionStatus.Full
            : WaybillConversionStatus.Partial,
          conversionDate: data.conversionDate || new Date(),
        })
        .where(eq(waybillsTable.id, loanWaybillId))
        .returning();

      // Check if sale is fully fulfilled
      const saleItems = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, data.saleId));

      const isSaleFullyFulfilled = saleItems.every(
        (item) =>
          item.quantity <= item.fulfilledQuantity &&
          item.backorderQuantity === 0
      );

      if (isSaleFullyFulfilled) {
        await tx
          .update(salesTable)
          .set({ status: "completed" })
          .where(eq(salesTable.id, data.saleId));
      }

      return { waybill: newWaybill, items: newLoanWaybillItems };
    });

    revalidatePath("/waybills");
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error converting loan waybill:", error);
    throw error;
  }
};
