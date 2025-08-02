"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import { ReceivingPurchaseFormValues } from "../validation";
import {
  inventoryTable,
  inventoryTransactionsTable,
  productsTable,
  purchaseItemsTable,
  purchasesTable,
  receivingItemsInvetoryTable,
  receivingItemsTable,
  receivingTable,
  storesTable,
  vendorsTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { fulfillBackorders } from "./inventoryStock.actions";
import { ReceivedPurchaseFilters } from "@/hooks/useReceivingPurchases";
import { InventoryTransactionType } from "@/types";

// add received purchase
export const addReceivedPurchase = async (
  data: ReceivingPurchaseFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // validation before any modifications
      const validationErrors = await validateReceivingData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // Create main receiving record
      const [receivedPurchase] = await tx
        .insert(receivingTable)
        .values({
          purchaseId: data.purchaseId,
          vendorId: data.vendorId,
          storeId: data.storeId,
          receivingOrderNumber: data.receivingOrderNumber,
          receivingDate: data.receivingDate,
          totalAmount: data.totalAmount,
          notes: data.notes,
        })
        .returning();

      // Prepare batch operations
      const receivingItemsToInsert = [];
      const receivingInventoryToInsert = [];
      const inventoryToInsert = [];
      const inventoryTransactions = [];
      const purchaseItemUpdates = new Map();
      const productUpdates = new Map();
      const backorderFulfillments = [];

      // Prepare all data for batch operations
      for (const product of data.products) {
        // Prepare receiving item
        receivingItemsToInsert.push({
          receivingId: receivedPurchase.id,
          purchaseItemId: product.purchaseItemId,
          productId: product.productId,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          productID: product.productID,
          productName: product.productName,
          totalCost: product.totalCost,
        });

        // Calculate total quantity for this product
        const totalQuantityForProduct = product.inventoryStock.reduce(
          (sum, stock) => sum + stock.quantity,
          0
        );

        // Accumulate purchase item updates
        const currentPurchaseUpdate =
          purchaseItemUpdates.get(product.purchaseItemId) || 0;
        purchaseItemUpdates.set(
          product.purchaseItemId,
          currentPurchaseUpdate + totalQuantityForProduct
        );

        // Accumulate product quantity updates
        const currentProductUpdate = productUpdates.get(product.productId) || 0;
        productUpdates.set(
          product.productId,
          currentProductUpdate + totalQuantityForProduct
        );
      }

      // BATCH INSERT: Receiving items
      const receivedItems = await tx
        .insert(receivingItemsTable)
        .values(receivingItemsToInsert)
        .returning();

      // Create mapping of products to their receiving items
      const receivingItemMap = new Map();
      receivedItems.forEach((item, index) => {
        receivingItemMap.set(data.products[index].productId, item);
      });

      // Prepare Inventory and related records
      for (const product of data.products) {
        const receivingItem = receivingItemMap.get(product.productId);

        for (const itemStock of product.inventoryStock) {
          // Prepare receiving item inventory
          receivingInventoryToInsert.push({
            receivingItemId: receivingItem.id,
            lotNumber: itemStock.lotNumber,
            quantity: itemStock.quantity,
            manufactureDate: itemStock.manufactureDate,
            expiryDate: itemStock.expiryDate,
          });

          // Prepare new inventory record
          const inventoryRecord = {
            productId: product.productId,
            storeId: data.storeId,
            lotNumber: itemStock.lotNumber,
            quantity: itemStock.quantity,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            manufactureDate: itemStock.manufactureDate,
            expiryDate: itemStock.expiryDate,
            receivedDate: data.receivingDate,
          };
          inventoryToInsert.push(inventoryRecord);

          // Store for backorder fulfillment (we'll get the ID after insert)
          backorderFulfillments.push({
            productId: product.productId,
            storeId: data.storeId,
            quantity: itemStock.quantity,
            inventoryId: "",
          });
        }
      }

      // Batch insert receiving item inventories
      if (receivingInventoryToInsert.length > 0) {
        await tx
          .insert(receivingItemsInvetoryTable)
          .values(receivingInventoryToInsert);
      }

      // Batch insert inventory records
      const newInventoryRecords = await tx
        .insert(inventoryTable)
        .values(inventoryToInsert)
        .returning();

      // Prepare inventory transactions using the new inventory IDs
      let inventoryIndex = 0;
      for (const product of data.products) {
        for (const itemStock of product.inventoryStock) {
          const newInventory = newInventoryRecords[inventoryIndex];

          inventoryTransactions.push({
            inventoryId: newInventory.id,
            productId: product.productId,
            storeId: data.storeId,
            userId: userId,
            transactionType: "purchase",
            quantityBefore: 0,
            quantityAfter: itemStock.quantity,
            transactionDate: new Date(),
            notes: `New stock received: ${itemStock.quantity} units`,
          });

          // Update backorder fulfillment data with inventory ID
          backorderFulfillments[inventoryIndex].inventoryId = newInventory.id;
          inventoryIndex++;
        }
      }

      // Batch insert inventory transactions
      if (inventoryTransactions.length > 0) {
        await tx.insert(inventoryTransactionsTable).values(
          inventoryTransactions as {
            inventoryId: string;
            productId: string;
            storeId: string;
            userId: string;
            transactionType: InventoryTransactionType;
            quantityBefore: number;
            quantityAfter: number;
            transactionDate: Date;
            notes: string;
          }[]
        );
      }

      // Update purchase items
      for (const [purchaseItemId, quantityReceived] of purchaseItemUpdates) {
        await tx
          .update(purchaseItemsTable)
          .set({
            quantityReceived: sql`${purchaseItemsTable.quantityReceived} + ${quantityReceived}`,
          })
          .where(
            and(
              eq(purchaseItemsTable.id, purchaseItemId),
              eq(purchaseItemsTable.isActive, true)
            )
          );
      }

      // Update product quantities
      for (const [productId, quantityAdded] of productUpdates) {
        await tx
          .update(productsTable)
          .set({
            quantity: sql`${productsTable.quantity} + ${quantityAdded}`,
          })
          .where(eq(productsTable.id, productId));
      }

      // Process backorder fulfillments
      for (const fulfillment of backorderFulfillments) {
        await fulfillBackorders(
          fulfillment.productId,
          fulfillment.storeId,
          fulfillment.inventoryId,
          userId,
          tx
        );
      }

      return { receivedPurchase: receivedPurchase, items: receivedItems };
    });

    revalidatePath("/purchases/receive-inventory");
    return parseStringify(result);
  } catch (error) {
    console.error("Error receiving purchase:", error);
    throw error;
  }
};

// Helper function for validation
export const validateReceivingData = async (
  data: ReceivingPurchaseFormValues
): Promise<string[]> => {
  const errors: string[] = [];

  if (!data.receivingOrderNumber?.trim()) {
    errors.push("Receiving order number is required");
  }

  if (!data.purchaseId) {
    errors.push("Purchase order is required");
  }

  if (!data.vendorId) {
    errors.push("Vendor is required");
  }

  if (!data.storeId) {
    errors.push("Store is required");
  }

  if (!data.products || data.products.length === 0) {
    errors.push("At least one product is required");
  }

  data.products?.forEach((product, index) => {
    if (!product.inventoryStock || product.inventoryStock.length === 0) {
      errors.push(`Product ${index + 1} must have inventory stock`);
    }

    if (product.costPrice <= 0) {
      errors.push(`Product ${index + 1} must have a valid cost price`);
    }

    product.inventoryStock?.forEach((stock, stockIndex) => {
      if (!stock.lotNumber?.trim()) {
        errors.push(
          `Product ${index + 1}, Stock ${
            stockIndex + 1
          }: Lot number is required`
        );
      }

      if (stock.quantity <= 0) {
        errors.push(
          `Product ${index + 1}, Stock ${
            stockIndex + 1
          }: Quantity must be greater than 0`
        );
      }

      if (
        stock.expiryDate &&
        stock.manufactureDate &&
        new Date(stock.expiryDate) <= new Date(stock.manufactureDate)
      ) {
        errors.push(
          `Product ${index + 1}, Stock ${
            stockIndex + 1
          }: Expiry date must be after manufacture date`
        );
      }
    });
  });

  return errors;
};

// get received purchase by ID
export const getReceivedPurchaseById = async (receivedPurchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main record with relations
      const receivedPurchase = await tx
        .select({
          receivedPurchase: receivingTable,
          purchaseOrder: purchasesTable,
          vendor: vendorsTable,
          store: storesTable,
        })
        .from(receivingTable)
        .leftJoin(
          purchasesTable,
          and(
            eq(receivingTable.purchaseId, purchasesTable.id),
            eq(purchasesTable.isActive, true)
          )
        )
        .leftJoin(
          vendorsTable,
          and(
            eq(receivingTable.vendorId, vendorsTable.id),
            eq(vendorsTable.isActive, true)
          )
        )
        .leftJoin(
          storesTable,
          and(
            eq(receivingTable.storeId, storesTable.id),
            eq(storesTable.isActive, true)
          )
        )
        .where(
          and(
            eq(receivingTable.id, receivedPurchaseId),
            eq(receivingTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!receivedPurchase) {
        return null;
      }

      // Get all receiving items for this purchase
      const items = await tx
        .select()
        .from(receivingItemsTable)
        .where(
          and(
            eq(receivingItemsTable.receivingId, receivedPurchaseId),
            eq(receivingItemsTable.isActive, true)
          )
        );

      // Get all inventory records for these receiving items
      const receivingItemIds = items.map((item) => item.id);
      const inventoryRecords =
        receivingItemIds.length > 0
          ? await tx
              .select({
                receivingItemInventory: receivingItemsInvetoryTable,
              })
              .from(receivingItemsInvetoryTable)
              .where(
                and(
                  inArray(
                    receivingItemsInvetoryTable.receivingItemId,
                    receivingItemIds
                  ),
                  eq(receivingItemsInvetoryTable.isActive, true)
                )
              )
          : [];

      // Create a map of receiving item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        const receivingItemId = record.receivingItemInventory.receivingItemId;
        if (!inventoryMap.has(receivingItemId)) {
          inventoryMap.set(receivingItemId, []);
        }
        inventoryMap.get(receivingItemId).push({
          id: record.receivingItemInventory.id,
          receivingItemId: record.receivingItemInventory.receivingItemId,
          lotNumber: record.receivingItemInventory.lotNumber,
          quantity: record.receivingItemInventory.quantity,
          manufactureDate: record.receivingItemInventory.manufactureDate,
          expiryDate: record.receivingItemInventory.expiryDate,
        });
      });

      // Combine the data
      const purchaseWithItems = {
        ...receivedPurchase,
        products: items.map((item) => ({
          id: item.id,
          receivingId: item.receivingId,
          purchaseItemId: item.purchaseItemId,
          productId: item.productId,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          productID: item.productID,
          productName: item.productName,
          totalCost: item.totalCost,
          inventoryStock: inventoryMap.get(item.id) || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isActive: item.isActive,
        })),
      };

      return purchaseWithItems;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting received purchase:", error);
    throw error;
  }
};

// get all received purchases
export const getReceivedPurchases = async (
  page: number = 0,
  limit: number = 10,
  getAllReceivedPurchases: boolean = false,
  filters?: ReceivedPurchaseFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main records with relations (all or paginated)
      let receivedPurchasesQuery = tx
        .select({
          receivedPurchase: receivingTable,
          purchaseOrder: purchasesTable,
          vendor: vendorsTable,
          store: storesTable,
        })
        .from(receivingTable)
        .leftJoin(
          purchasesTable,
          and(
            eq(receivingTable.purchaseId, purchasesTable.id),
            eq(purchasesTable.isActive, true)
          )
        )
        .leftJoin(
          vendorsTable,
          and(
            eq(receivingTable.vendorId, vendorsTable.id),
            eq(vendorsTable.isActive, true)
          )
        )
        .leftJoin(
          storesTable,
          and(
            eq(receivingTable.storeId, storesTable.id),
            eq(storesTable.isActive, true)
          )
        )
        .$dynamic();

      // Create conditions array
      const conditions = [eq(receivingTable.isActive, true)];

      // Apply filters if provided
      if (filters) {
        // Total Amount range
        if (filters.totalAmount_min !== undefined) {
          conditions.push(
            gte(receivingTable.totalAmount, filters.totalAmount_min)
          );
        }
        if (filters.totalAmount_max !== undefined) {
          conditions.push(
            lte(receivingTable.totalAmount, filters.totalAmount_max)
          );
        }

        // Receiving date range
        if (filters.receivingDate_start) {
          conditions.push(
            gte(
              receivingTable.receivingDate,
              new Date(filters.receivingDate_start)
            )
          );
        }
        if (filters.receivingDate_end) {
          conditions.push(
            lte(
              receivingTable.receivingDate,
              new Date(filters.receivingDate_end)
            )
          );
        }
      }

      // Apply where conditions
      receivedPurchasesQuery = receivedPurchasesQuery.where(and(...conditions));

      // Apply order by
      receivedPurchasesQuery = receivedPurchasesQuery.orderBy(
        desc(receivingTable.createdAt)
      );

      if (!getAllReceivedPurchases) {
        receivedPurchasesQuery = receivedPurchasesQuery
          .limit(limit)
          .offset(page * limit);
      }

      const receivedPurchases = await receivedPurchasesQuery;

      // Get all receiving items for these purchases in a single query
      const receivedPurchaseIds = receivedPurchases.map(
        (p) => p.receivedPurchase.id
      );
      const items =
        receivedPurchaseIds.length > 0
          ? await tx
              .select()
              .from(receivingItemsTable)
              .where(
                and(
                  inArray(receivingItemsTable.receivingId, receivedPurchaseIds),
                  eq(receivingItemsTable.isActive, true)
                )
              )
          : [];

      // Get all inventory records for these receiving items
      const receivingItemIds = items.map((item) => item.id);
      const inventoryRecords =
        receivingItemIds.length > 0
          ? await tx
              .select({
                receivingItemInventory: receivingItemsInvetoryTable,
              })
              .from(receivingItemsInvetoryTable)
              .where(
                and(
                  inArray(
                    receivingItemsInvetoryTable.receivingItemId,
                    receivingItemIds
                  ),
                  eq(receivingItemsInvetoryTable.isActive, true)
                )
              )
          : [];

      // Create a map of receiving item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        const receivingItemId = record.receivingItemInventory.receivingItemId;
        if (!inventoryMap.has(receivingItemId)) {
          inventoryMap.set(receivingItemId, []);
        }
        inventoryMap.get(receivingItemId).push({
          id: record.receivingItemInventory.id,
          receivingItemId: record.receivingItemInventory.receivingItemId,
          lotNumber: record.receivingItemInventory.lotNumber,
          quantity: record.receivingItemInventory.quantity,
          manufactureDate: record.receivingItemInventory.manufactureDate,
          expiryDate: record.receivingItemInventory.expiryDate,
        });
      });

      // Combine the data
      const purchasesWithItems = receivedPurchases.map((purchase) => ({
        ...purchase,
        products: items
          .filter((item) => item.receivingId === purchase.receivedPurchase.id)
          .map((item) => ({
            id: item.id,
            receivingId: item.receivingId,
            purchaseItemId: item.purchaseItemId,
            productId: item.productId,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            productID: item.productID,
            productName: item.productName,
            totalCost: item.totalCost,
            inventoryStock: inventoryMap.get(item.id) || [],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            isActive: item.isActive,
          })),
      }));

      // Get total count for pagination
      const total = getAllReceivedPurchases
        ? receivedPurchases.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(receivingTable)
            .where(and(...conditions))
            .then((res) => res[0]?.count || 0);

      return {
        documents: purchasesWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting received purchases:", error);
    throw error;
  }
};

// edit received purchase
export const editReceivedPurchase = async (
  data: ReceivingPurchaseFormValues,
  id: string,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. FETCH: Get existing data upfront
      const [existingReceiving] = await tx
        .select()
        .from(receivingTable)
        .where(eq(receivingTable.id, id));

      if (!existingReceiving) {
        throw new Error("Received purchase not found");
      }

      // Get existing receiving items with their inventory stock
      const existingItems = await tx
        .select({
          receivingItem: receivingItemsTable,
          inventoryStock: receivingItemsInvetoryTable,
        })
        .from(receivingItemsTable)
        .leftJoin(
          receivingItemsInvetoryTable,
          eq(
            receivingItemsTable.id,
            receivingItemsInvetoryTable.receivingItemId
          )
        )
        .where(
          and(
            eq(receivingItemsTable.receivingId, id),
            eq(receivingItemsTable.isActive, true),
            eq(receivingItemsInvetoryTable.isActive, true)
          )
        );

      // Group existing items by product for easier processing
      const existingItemsMap = new Map();
      for (const item of existingItems) {
        const productId = item.receivingItem.productId;
        if (!existingItemsMap.has(productId)) {
          existingItemsMap.set(productId, {
            receivingItem: item.receivingItem,
            inventoryStocks: [],
          });
        }
        if (item.inventoryStock) {
          existingItemsMap
            .get(productId)
            .inventoryStocks.push(item.inventoryStock);
        }
      }

      // Get all related inventory records for reversal
      const existingInventoryIds = [];
      for (const item of existingItems) {
        if (item.inventoryStock) {
          const inventoryRecords = await tx
            .select()
            .from(inventoryTable)
            .where(
              and(
                eq(inventoryTable.productId, item.receivingItem.productId),
                eq(inventoryTable.storeId, existingReceiving.storeId),
                eq(inventoryTable.lotNumber, item.inventoryStock.lotNumber)
              )
            );
          existingInventoryIds.push(...inventoryRecords.map((inv) => inv.id));
        }
      }

      // 2. VALIDATION: Early validation
      const validationErrors = await validateReceivingData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // 3. UPDATE: Main receiving record
      const [updatedReceiving] = await tx
        .update(receivingTable)
        .set({
          purchaseId: data.purchaseId,
          vendorId: data.vendorId,
          storeId: data.storeId,
          receivingOrderNumber: data.receivingOrderNumber,
          receivingDate: data.receivingDate,
          totalAmount: data.totalAmount,
          notes: data.notes,
        })
        .where(eq(receivingTable.id, id))
        .returning();

      // 4. PREPARE: Batch operations for complete replacement strategy
      // We'll delete all existing records and recreate them (simpler and safer)

      const inventoryTransactions = [];
      const purchaseItemAdjustments = new Map();
      const productAdjustments = new Map();

      // Calculate what needs to be reversed from existing data
      for (const [productId, itemData] of existingItemsMap) {
        let totalExistingQuantity = 0;

        for (const stock of itemData.inventoryStocks) {
          totalExistingQuantity += stock.quantity;

          // Prepare reversal transaction
          inventoryTransactions.push({
            inventoryId: null,
            productId: productId,
            storeId: existingReceiving.storeId,
            userId: userId,
            transactionType: "adjustment",
            quantityBefore: 0,
            quantityAfter: 0,
            transactionDate: new Date(),
            notes: `Stock reversed due to receiving edit: -${stock.quantity} units`,
            isReversal: true,
            lotNumber: stock.lotNumber,
            quantityToReverse: stock.quantity,
          });
        }

        // Track purchase item adjustments (subtract existing)
        const currentPurchaseAdjustment =
          purchaseItemAdjustments.get(itemData.receivingItem.purchaseItemId) ||
          0;
        purchaseItemAdjustments.set(
          itemData.receivingItem.purchaseItemId,
          currentPurchaseAdjustment - totalExistingQuantity
        );

        // Track product adjustments (subtract existing)
        const currentProductAdjustment = productAdjustments.get(productId) || 0;
        productAdjustments.set(
          productId,
          currentProductAdjustment - totalExistingQuantity
        );
      }

      // Calculate what needs to be added from new data
      const newReceivingItems = [];
      const newReceivingInventories = [];
      const newInventoryRecords = [];
      const backorderFulfillments = [];

      for (const product of data.products) {
        // Prepare new receiving item
        newReceivingItems.push({
          receivingId: updatedReceiving.id,
          purchaseItemId: product.purchaseItemId,
          productId: product.productId,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          productID: product.productID,
          productName: product.productName,
          totalCost: product.totalCost,
        });

        let totalNewQuantity = 0;

        for (const stock of product.inventoryStock) {
          totalNewQuantity += stock.quantity;

          // Prepare new inventory record
          newInventoryRecords.push({
            productId: product.productId,
            storeId: data.storeId,
            lotNumber: stock.lotNumber,
            quantity: stock.quantity,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            manufactureDate: stock.manufactureDate,
            expiryDate: stock.expiryDate,
            receivedDate: data.receivingDate,
          });

          // Prepare addition transaction
          inventoryTransactions.push({
            inventoryId: null,
            productId: product.productId,
            storeId: data.storeId,
            userId: userId,
            transactionType: "purchase",
            quantityBefore: 0,
            quantityAfter: stock.quantity,
            transactionDate: new Date(),
            notes: `Stock added via receiving edit: +${stock.quantity} units`,
            isAddition: true,
            stockData: stock,
          });

          backorderFulfillments.push({
            productId: product.productId,
            storeId: data.storeId,
            quantity: stock.quantity,
            inventoryId: "",
          });
        }

        // Track purchase item adjustments (add new)
        const currentPurchaseAdjustment =
          purchaseItemAdjustments.get(product.purchaseItemId) || 0;
        purchaseItemAdjustments.set(
          product.purchaseItemId,
          currentPurchaseAdjustment + totalNewQuantity
        );

        // Track product adjustments (add new)
        const currentProductAdjustment =
          productAdjustments.get(product.productId) || 0;
        productAdjustments.set(
          product.productId,
          currentProductAdjustment + totalNewQuantity
        );
      }

      // 5. EXECUTE: Reversal operations

      // Reverse existing inventory and log transactions
      for (const transaction of inventoryTransactions.filter(
        (t) => t.isReversal
      )) {
        // Find the inventory record to reverse
        const [inventoryRecord] = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.productId, transaction.productId),
              eq(inventoryTable.storeId, existingReceiving.storeId),
              eq(inventoryTable.lotNumber, transaction.lotNumber)
            )
          );

        if (inventoryRecord) {
          const newQuantity =
            inventoryRecord.quantity - transaction.quantityToReverse;

          // Log the reversal transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: inventoryRecord.id,
            productId: transaction.productId,
            storeId: transaction.storeId,
            userId: transaction.userId,
            transactionType:
              transaction.transactionType as InventoryTransactionType,
            quantityBefore: inventoryRecord.quantity,
            quantityAfter: Math.max(newQuantity, 0),
            transactionDate: transaction.transactionDate,
            notes: transaction.notes,
          });

          if (newQuantity <= 0) {
            // Delete inventory record if quantity becomes 0 or negative
            await tx
              .delete(inventoryTable)
              .where(eq(inventoryTable.id, inventoryRecord.id));
          } else {
            // Update inventory quantity
            await tx
              .update(inventoryTable)
              .set({ quantity: newQuantity })
              .where(eq(inventoryTable.id, inventoryRecord.id));
          }
        }
      }

      // 6. DELETE: Existing receiving records

      // Delete existing receiving item inventories
      await tx
        .update(receivingItemsInvetoryTable)
        .set({ isActive: false })
        .where(
          inArray(
            receivingItemsInvetoryTable.receivingItemId,
            Array.from(existingItemsMap.values()).map(
              (item) => item.receivingItem.id
            )
          )
        );

      // Delete existing receiving items
      await tx
        .update(receivingItemsTable)
        .set({ isActive: false })
        .where(
          inArray(
            receivingItemsTable.id,
            Array.from(existingItemsMap.values()).map(
              (item) => item.receivingItem.id
            )
          )
        );

      // 7. CREATE: New records

      // Insert new receiving items
      const createdReceivingItems = await tx
        .insert(receivingItemsTable)
        .values(newReceivingItems)
        .returning();

      // Prepare receiving item inventories with the new receiving item IDs
      let itemIndex = 0;
      for (const product of data.products) {
        const receivingItem = createdReceivingItems[itemIndex];

        for (const stock of product.inventoryStock) {
          newReceivingInventories.push({
            receivingItemId: receivingItem.id,
            lotNumber: stock.lotNumber,
            quantity: stock.quantity,
            manufactureDate: stock.manufactureDate,
            expiryDate: stock.expiryDate,
          });
        }
        itemIndex++;
      }

      // Insert new receiving item inventories
      if (newReceivingInventories.length > 0) {
        await tx
          .insert(receivingItemsInvetoryTable)
          .values(newReceivingInventories);
      }

      // Insert new inventory records
      const createdInventoryRecords = await tx
        .insert(inventoryTable)
        .values(newInventoryRecords)
        .returning();

      // Log addition transactions with correct inventory IDs
      let inventoryIndex = 0;
      const additionTransactions = inventoryTransactions.filter(
        (t) => t.isAddition
      );

      for (const transaction of additionTransactions) {
        const inventory = createdInventoryRecords[inventoryIndex];

        await tx.insert(inventoryTransactionsTable).values({
          inventoryId: inventory.id,
          productId: transaction.productId,
          storeId: transaction.storeId,
          userId: transaction.userId,
          transactionType:
            transaction.transactionType as InventoryTransactionType,
          quantityBefore: transaction.quantityBefore,
          quantityAfter: transaction.quantityAfter,
          transactionDate: transaction.transactionDate,
          notes: transaction.notes,
        });

        // Update backorder fulfillment data
        backorderFulfillments[inventoryIndex].inventoryId = inventory.id;
        inventoryIndex++;
      }

      // 8. UPDATE: Purchase items and products with net adjustments

      for (const [purchaseItemId, adjustment] of purchaseItemAdjustments) {
        if (adjustment !== 0) {
          await tx
            .update(purchaseItemsTable)
            .set({
              quantityReceived: sql`${purchaseItemsTable.quantityReceived} + ${adjustment}`,
            })
            .where(
              and(
                eq(purchaseItemsTable.id, purchaseItemId),
                eq(purchaseItemsTable.isActive, true)
              )
            );
        }
      }

      for (const [productId, adjustment] of productAdjustments) {
        if (adjustment !== 0) {
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} + ${adjustment}`,
            })
            .where(eq(productsTable.id, productId));
        }
      }

      // 9. FULFILL: Backorders for new inventory
      for (const fulfillment of backorderFulfillments) {
        if (fulfillment.inventoryId) {
          await fulfillBackorders(
            fulfillment.productId,
            fulfillment.storeId,
            fulfillment.inventoryId,
            userId,
            tx
          );
        }
      }

      return {
        receivedPurchase: updatedReceiving,
        items: createdReceivingItems,
      };
    });

    revalidatePath("/purchases/receive-inventory");
    revalidatePath(`/purchases/edit-received-purchase/${id}`);
    return parseStringify(result);
  } catch (error) {
    console.error("Error updating received purchase:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to update received purchase"
    );
  }
};

// Generate Receiving Order number
export const generateReceivingOrdereNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastReceivedOrder = await tx
        .select({ receivingOrderNumber: receivingTable.receivingOrderNumber })
        .from(receivingTable)
        .where(sql`receiving_order_number LIKE ${`RO${year}/${month}/%`}`)
        .orderBy(desc(receivingTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastReceivedOrder.length > 0) {
        const lastReceivingOrderNumber =
          lastReceivedOrder[0].receivingOrderNumber;
        const lastSequence = parseInt(
          lastReceivingOrderNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `RO${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating Receiving Order number:", error);
    throw error;
  }
};
// permanently delete received purchase
export const deleteReceivedPurchase = async (
  receivingId: string,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. FETCH: Get all existing data upfront
      const [existingReceiving] = await tx
        .select()
        .from(receivingTable)
        .where(eq(receivingTable.id, receivingId));

      if (!existingReceiving) {
        throw new Error("Received purchase not found");
      }

      // Get existing receiving items with their inventory stock
      const existingItemsWithStock = await tx
        .select({
          receivingItem: receivingItemsTable,
          inventoryStock: receivingItemsInvetoryTable,
        })
        .from(receivingItemsTable)
        .leftJoin(
          receivingItemsInvetoryTable,
          eq(
            receivingItemsTable.id,
            receivingItemsInvetoryTable.receivingItemId
          )
        )
        .where(
          and(
            eq(receivingItemsTable.receivingId, receivingId),
            eq(receivingItemsTable.isActive, true),
            or(
              eq(receivingItemsInvetoryTable.isActive, true),
              isNull(receivingItemsInvetoryTable.isActive)
            )
          )
        );

      if (existingItemsWithStock.length === 0) {
        // Nothing to reverse, just delete the receiving record
        const [deletedReceiving] = await tx
          .delete(receivingTable)
          .where(eq(receivingTable.id, receivingId))
          .returning();

        return deletedReceiving;
      }

      // Group by product and collect all inventory stocks
      const productInventoryMap = new Map();
      for (const item of existingItemsWithStock) {
        const productId = item.receivingItem.productId;
        if (!productInventoryMap.has(productId)) {
          productInventoryMap.set(productId, {
            receivingItem: item.receivingItem,
            inventoryStocks: [],
          });
        }
        if (item.inventoryStock) {
          productInventoryMap
            .get(productId)
            .inventoryStocks.push(item.inventoryStock);
        }
      }

      // 2. BATCH FETCH: Get all inventory records that need to be reversed
      const inventoryRecordsToProcess = [];
      for (const [productId, data] of productInventoryMap) {
        for (const stock of data.inventoryStocks) {
          const inventoryRecords = await tx
            .select()
            .from(inventoryTable)
            .where(
              and(
                eq(inventoryTable.productId, productId),
                eq(inventoryTable.storeId, existingReceiving.storeId),
                eq(inventoryTable.lotNumber, stock.lotNumber),
                eq(inventoryTable.isActive, true)
              )
            );

          for (const inventory of inventoryRecords) {
            inventoryRecordsToProcess.push({
              inventory,
              stock,
              productId,
              receivingItem: data.receivingItem,
            });
          }
        }
      }

      // 3. PREPARE: Batch operations for inventory reversal
      const inventoryTransactions = [];
      const inventoryUpdates = [];
      const inventoriesToDelete = [];
      const purchaseItemAdjustments = new Map();
      const productAdjustments = new Map();

      for (const {
        inventory,
        stock,
        productId,
        receivingItem,
      } of inventoryRecordsToProcess) {
        const quantityToReverse = Math.min(stock.quantity, inventory.quantity);
        const newQuantity = inventory.quantity - quantityToReverse;

        // Prepare inventory transaction log
        inventoryTransactions.push({
          inventoryId: inventory.id,
          productId: productId,
          storeId: existingReceiving.storeId,
          userId: userId,
          transactionType: "adjustment" as InventoryTransactionType,
          quantityBefore: inventory.quantity,
          quantityAfter: Math.max(newQuantity, 0),
          transactionDate: new Date(),
          notes: `Stock removed due to receiving deletion: -${quantityToReverse} units`,
        });

        if (newQuantity <= 0) {
          // Mark for deletion
          inventoriesToDelete.push(inventory.id);
        } else {
          // Mark for quantity update
          inventoryUpdates.push({
            id: inventory.id,
            newQuantity: newQuantity,
          });
        }

        // Accumulate purchase item adjustments
        const currentPurchaseAdjustment =
          purchaseItemAdjustments.get(receivingItem.purchaseItemId) || 0;
        purchaseItemAdjustments.set(
          receivingItem.purchaseItemId,
          currentPurchaseAdjustment - quantityToReverse
        );

        // Accumulate product adjustments
        const currentProductAdjustment = productAdjustments.get(productId) || 0;
        productAdjustments.set(
          productId,
          currentProductAdjustment - quantityToReverse
        );
      }

      // 4. EXECUTE: Batch inventory reversal operations

      // Log all inventory transactions
      if (inventoryTransactions.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(inventoryTransactions);
      }

      // Update inventory quantities
      for (const update of inventoryUpdates) {
        await tx
          .update(inventoryTable)
          .set({ quantity: update.newQuantity })
          .where(eq(inventoryTable.id, update.id));
      }

      // Delete inventory records with zero quantities
      if (inventoriesToDelete.length > 0) {
        await tx
          .delete(inventoryTable)
          .where(inArray(inventoryTable.id, inventoriesToDelete));
      }

      // Update purchase items (reverse received quantities)
      for (const [purchaseItemId, adjustment] of purchaseItemAdjustments) {
        if (adjustment !== 0) {
          await tx
            .update(purchaseItemsTable)
            .set({
              quantityReceived: sql`${purchaseItemsTable.quantityReceived} + ${adjustment}`,
            })
            .where(
              and(
                eq(purchaseItemsTable.id, purchaseItemId),
                eq(purchaseItemsTable.isActive, true)
              )
            );
        }
      }

      // Update product quantities
      for (const [productId, adjustment] of productAdjustments) {
        if (adjustment !== 0) {
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} + ${adjustment}`,
            })
            .where(eq(productsTable.id, productId));
        }
      }

      // 5. DELETE: Remove all receiving records

      // Delete receiving item inventories
      await tx.delete(receivingItemsInvetoryTable).where(
        inArray(
          receivingItemsInvetoryTable.receivingItemId,
          existingItemsWithStock.map((item) => item.receivingItem.id)
        )
      );

      // Delete receiving items
      await tx
        .delete(receivingItemsTable)
        .where(eq(receivingItemsTable.receivingId, receivingId));

      // Delete the main receiving record
      const [deletedReceiving] = await tx
        .delete(receivingTable)
        .where(eq(receivingTable.id, receivingId))
        .returning();

      return deletedReceiving;
    });

    revalidatePath("/purchases/receive-inventory");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting received purchase:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to delete received purchase"
    );
  }
};

// soft delete received purchase
export const softDeleteReceivedPurchase = async (
  receivingId: string,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. FETCH: Get all existing data upfront
      const [existingReceiving] = await tx
        .select()
        .from(receivingTable)
        .where(
          and(
            eq(receivingTable.id, receivingId),
            eq(receivingTable.isActive, true)
          )
        );

      if (!existingReceiving) {
        throw new Error("Received purchase not found or already deleted");
      }

      // Get existing receiving items with their inventory stock
      const existingItemsWithStock = await tx
        .select({
          receivingItem: receivingItemsTable,
          inventoryStock: receivingItemsInvetoryTable,
        })
        .from(receivingItemsTable)
        .leftJoin(
          receivingItemsInvetoryTable,
          eq(
            receivingItemsTable.id,
            receivingItemsInvetoryTable.receivingItemId
          )
        )
        .where(
          and(
            eq(receivingItemsTable.receivingId, receivingId),
            eq(receivingItemsTable.isActive, true),
            or(
              eq(receivingItemsInvetoryTable.isActive, true),
              isNull(receivingItemsInvetoryTable.isActive)
            )
          )
        );

      if (existingItemsWithStock.length === 0) {
        // Nothing to reverse, just soft delete the receiving record
        const [updatedReceiving] = await tx
          .update(receivingTable)
          .set({
            isActive: false,
          })
          .where(eq(receivingTable.id, receivingId))
          .returning();

        return updatedReceiving;
      }

      // Group by product and collect all inventory stocks
      const productInventoryMap = new Map();
      for (const item of existingItemsWithStock) {
        const productId = item.receivingItem.productId;
        if (!productInventoryMap.has(productId)) {
          productInventoryMap.set(productId, {
            receivingItem: item.receivingItem,
            inventoryStocks: [],
          });
        }
        if (item.inventoryStock) {
          productInventoryMap
            .get(productId)
            .inventoryStocks.push(item.inventoryStock);
        }
      }

      // 2. BATCH FETCH: Get all inventory records that need to be reversed
      const inventoryRecordsToProcess = [];
      for (const [productId, data] of productInventoryMap) {
        for (const stock of data.inventoryStocks) {
          const inventoryRecords = await tx
            .select()
            .from(inventoryTable)
            .where(
              and(
                eq(inventoryTable.productId, productId),
                eq(inventoryTable.storeId, existingReceiving.storeId),
                eq(inventoryTable.lotNumber, stock.lotNumber),
                eq(inventoryTable.isActive, true)
              )
            );

          for (const inventory of inventoryRecords) {
            inventoryRecordsToProcess.push({
              inventory,
              stock,
              productId,
              receivingItem: data.receivingItem,
            });
          }
        }
      }

      // 3. PREPARE: Batch operations for inventory reversal
      const inventoryTransactions = [];
      const inventoryUpdates = [];
      const inventoriesToSoftDelete = [];
      const purchaseItemAdjustments = new Map();
      const productAdjustments = new Map();

      for (const {
        inventory,
        stock,
        productId,
        receivingItem,
      } of inventoryRecordsToProcess) {
        const quantityToReverse = Math.min(stock.quantity, inventory.quantity);
        const newQuantity = inventory.quantity - quantityToReverse;

        // Prepare inventory transaction log
        inventoryTransactions.push({
          inventoryId: inventory.id,
          productId: productId,
          storeId: existingReceiving.storeId,
          userId: userId,
          transactionType: "adjustment" as InventoryTransactionType,
          quantityBefore: inventory.quantity,
          quantityAfter: Math.max(newQuantity, 0),
          transactionDate: new Date(),
          notes: `Stock removed due to receiving soft deletion: -${quantityToReverse} units`,
        });

        if (newQuantity <= 0) {
          // Mark for soft deletion
          inventoriesToSoftDelete.push(inventory.id);
        } else {
          // Mark for quantity update
          inventoryUpdates.push({
            id: inventory.id,
            newQuantity: newQuantity,
          });
        }

        // Accumulate purchase item adjustments
        const currentPurchaseAdjustment =
          purchaseItemAdjustments.get(receivingItem.purchaseItemId) || 0;
        purchaseItemAdjustments.set(
          receivingItem.purchaseItemId,
          currentPurchaseAdjustment - quantityToReverse
        );

        // Accumulate product adjustments
        const currentProductAdjustment = productAdjustments.get(productId) || 0;
        productAdjustments.set(
          productId,
          currentProductAdjustment - quantityToReverse
        );
      }

      // 4. EXECUTE: Batch inventory reversal operations

      // Log all inventory transactions
      if (inventoryTransactions.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(inventoryTransactions);
      }

      // Update inventory quantities
      for (const update of inventoryUpdates) {
        await tx
          .update(inventoryTable)
          .set({ quantity: update.newQuantity })
          .where(eq(inventoryTable.id, update.id));
      }

      // Soft delete inventory records with zero quantities
      if (inventoriesToSoftDelete.length > 0) {
        await tx
          .update(inventoryTable)
          .set({
            isActive: false,
          })
          .where(inArray(inventoryTable.id, inventoriesToSoftDelete));
      }

      // Update purchase items (reverse received quantities)
      for (const [purchaseItemId, adjustment] of purchaseItemAdjustments) {
        if (adjustment !== 0) {
          await tx
            .update(purchaseItemsTable)
            .set({
              quantityReceived: sql`${purchaseItemsTable.quantityReceived} + ${adjustment}`,
            })
            .where(
              and(
                eq(purchaseItemsTable.id, purchaseItemId),
                eq(purchaseItemsTable.isActive, true)
              )
            );
        }
      }

      // Update product quantities
      for (const [productId, adjustment] of productAdjustments) {
        if (adjustment !== 0) {
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} + ${adjustment}`,
            })
            .where(eq(productsTable.id, productId));
        }
      }

      // 5. SOFT DELETE: Mark all receiving records as inactive

      // Soft delete receiving item inventories
      await tx
        .update(receivingItemsInvetoryTable)
        .set({
          isActive: false,
        })
        .where(
          inArray(
            receivingItemsInvetoryTable.receivingItemId,
            existingItemsWithStock.map((item) => item.receivingItem.id)
          )
        );

      // Soft delete receiving items
      await tx
        .update(receivingItemsTable)
        .set({
          isActive: false,
        })
        .where(eq(receivingItemsTable.receivingId, receivingId));

      // Soft delete the main receiving record
      const [updatedReceiving] = await tx
        .update(receivingTable)
        .set({
          isActive: false,
        })
        .where(eq(receivingTable.id, receivingId))
        .returning();

      return updatedReceiving;
    });

    revalidatePath("/purchases/receive-inventory");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting received purchase:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to soft delete received purchase"
    );
  }
};
