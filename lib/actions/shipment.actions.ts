/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import {
  parcelItemsTable,
  parcelsTable,
  shipmentsTable,
  vendorsTable,
} from "@/drizzle/schema";
import {
  CarrierType,
  ParcelItem,
  ShipmentStatus,
  ShipperType,
  ShippingMode,
} from "@/types";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  InferInsertModel,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { ShipmentFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ShipmentFilters } from "@/hooks/useShipments";
import { getCompanyConfig } from "../config/company-config";

type NewShipment = InferInsertModel<typeof shipmentsTable>;

const buildFilterConditions = (filters: ShipmentFilters) => {
  const conditions = [];

  conditions.push(eq(shipmentsTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(shipmentsTable.trackingNumber, searchTerm),
        ilike(shipmentsTable.shipmentRefNumber, searchTerm),
        ilike(shipmentsTable.shipperName, searchTerm),
        ilike(shipmentsTable.carrierName, searchTerm),
        ilike(shipmentsTable.containerNumber, searchTerm),
        ilike(shipmentsTable.flightNumber, searchTerm),
        ilike(shipmentsTable.destinationPort, searchTerm),
        ilike(shipmentsTable.originPort, searchTerm),
        ilike(vendorsTable.name, searchTerm)
      )
    );
  }

  // Total Amount range
  if (filters.totalAmount_min !== undefined) {
    conditions.push(gte(shipmentsTable.totalAmount, filters.totalAmount_min));
  }
  if (filters.totalAmount_max !== undefined) {
    conditions.push(lte(shipmentsTable.totalAmount, filters.totalAmount_max));
  }

  // date range
  if (filters.shippingDate_start) {
    conditions.push(
      gte(shipmentsTable.shippingDate, new Date(filters.shippingDate_start))
    );
  }
  if (filters.shippingDate_end) {
    conditions.push(
      lte(shipmentsTable.shippingDate, new Date(filters.shippingDate_end))
    );
  }

  // Status filter
  if (filters.status) {
    conditions.push(
      eq(shipmentsTable.status, filters.status as ShipmentStatus)
    );
  }
  // Payment Status filter
  if (filters.shippingMode) {
    conditions.push(
      eq(shipmentsTable.shippingMode, filters.shippingMode as ShippingMode)
    );
  }

  if (filters.carrierType) {
    conditions.push(
      eq(shipmentsTable.carrierType, filters.carrierType as CarrierType)
    );
  }

  if (filters.shipperType) {
    conditions.push(
      eq(shipmentsTable.shipperType, filters.shipperType as ShipperType)
    );
  }

  return conditions;
};

// Add Shipment
export const addShipment = async (shipment: ShipmentFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      const { parcels, ...shipmentDataForInsert } = shipment;

      const finalShipmentData: NewShipment = {
        ...shipmentDataForInsert,
        containerNumber: shipmentDataForInsert.containerNumber || null,
        flightNumber: shipmentDataForInsert.flightNumber || null,
        notes: shipmentDataForInsert.notes || "",
        purchaseIds:
          shipmentDataForInsert.purchaseIds &&
          shipmentDataForInsert.purchaseIds.length > 0
            ? shipmentDataForInsert.purchaseIds
            : null,
        vendorIds:
          shipmentDataForInsert.vendorIds &&
          shipmentDataForInsert.vendorIds.length > 0
            ? shipmentDataForInsert.vendorIds
            : null,
        shippingMode: shipmentDataForInsert.shippingMode as ShippingMode,
        shipperType: shipmentDataForInsert.shipperType as ShipperType,
        carrierType: shipmentDataForInsert.carrierType as CarrierType,
        status: shipmentDataForInsert.status as ShipmentStatus,
        originPort: shipmentDataForInsert.originPort,
        destinationPort: shipmentDataForInsert.destinationPort,
        shippingDate: shipmentDataForInsert.shippingDate,
        totalAmount: shipmentDataForInsert.totalAmount,
        numberOfPackages: shipmentDataForInsert.numberOfPackages,
        totalItems: shipmentDataForInsert.totalItems,
        shipperName: shipmentDataForInsert.shipperName,
        shipperAddress: shipmentDataForInsert.shipperAddress,
        carrierName: shipmentDataForInsert.carrierName,
        trackingNumber: shipmentDataForInsert.trackingNumber,
        shipmentRefNumber: shipmentDataForInsert.shipmentRefNumber,
        attachments: shipmentDataForInsert.attachments || [],
        estimatedArrivalDate:
          shipmentDataForInsert.estimatedArrivalDate || null,
        dateShipped: shipmentDataForInsert.dateShipped || null,
        actualArrivalDate: shipmentDataForInsert.actualArrivalDate || null,
      };

      const [newShipment] = await tx
        .insert(shipmentsTable)
        .values(finalShipmentData)
        .returning();

      if (!newShipment) {
        throw new Error("Failed to create main shipment record.");
      }

      // Insert parcels and their items
      const createdParcels = await Promise.all(
        parcels.map(async (parcel) => {
          const [newParcel] = await tx
            .insert(parcelsTable)
            .values({
              shipmentId: newShipment.id,
              parcelNumber: parcel.parcelNumber,
              packageType: parcel.packageType,
              length: parcel.length,
              width: parcel.width,
              height: parcel.height,
              netWeight: parcel.netWeight,
              grossWeight: parcel.grossWeight,
              volumetricWeight: parcel.volumetricWeight,
              chargeableWeight: parcel.chargeableWeight,
              volumetricDivisor: parcel.volumetricDivisor,
              description: parcel.description || "",
              unitPricePerKg: parcel.unitPricePerKg,
              totalAmount: parcel.totalAmount,
              totalItems: parcel.totalItems,
            })
            .returning();

          if (!newParcel) {
            throw new Error(`Failed to create parcel ${parcel.parcelNumber}.`);
          }

          const createdParcelItems = await Promise.all(
            parcel.items.map(async (item) => {
              const [newParcelItem] = await tx
                .insert(parcelItemsTable)
                .values({
                  parcelId: newParcel.id,
                  productId: item.productId || null,
                  productName: item.productName,
                  productID: item.productID,
                  productUnit: item.productUnit,
                  quantity: item.quantity,
                  netWeight: item.netWeight,
                  isPurchaseItem: item.isPurchaseItem,
                  purchaseReference: item.purchaseReference || null,
                })
                .returning();
              return newParcelItem;
            })
          );
          return { ...newParcel, items: createdParcelItems };
        })
      );

      return { shipment: newShipment, parcels: createdParcels };
    });

    revalidatePath("/purchases/shipments");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating shipment:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to create shipment"
    );
  }
};

// Edit Shipment
export const editShipment = async (
  shipmentId: string,
  data: ShipmentFormValues
) => {
  try {
    const updatedShipment = await db.transaction(async (tx) => {
      const { parcels, ...shipmentDataForUpdate } = data;

      // 1. Update main shipment record
      const [mainShipmentUpdate] = await tx
        .update(shipmentsTable)
        .set({
          shipmentRefNumber: shipmentDataForUpdate.shipmentRefNumber,
          numberOfPackages: shipmentDataForUpdate.numberOfPackages,
          totalItems: shipmentDataForUpdate.totalItems,
          shippingMode: shipmentDataForUpdate.shippingMode as ShippingMode,
          shipperType: shipmentDataForUpdate.shipperType as ShipperType,
          shippingVendorId: shipmentDataForUpdate.shippingVendorId,
          shipperName: shipmentDataForUpdate.shipperName,
          shipperAddress: shipmentDataForUpdate.shipperAddress,
          carrierType: shipmentDataForUpdate.carrierType as CarrierType,
          carrierName: shipmentDataForUpdate.carrierName,
          trackingNumber: shipmentDataForUpdate.trackingNumber,
          shippingDate: shipmentDataForUpdate.shippingDate
            ? new Date(shipmentDataForUpdate.shippingDate)
            : undefined,
          estimatedArrivalDate: shipmentDataForUpdate.estimatedArrivalDate
            ? new Date(shipmentDataForUpdate.estimatedArrivalDate)
            : undefined,
          dateShipped: shipmentDataForUpdate.dateShipped
            ? new Date(shipmentDataForUpdate.dateShipped)
            : undefined,
          actualArrivalDate: shipmentDataForUpdate.actualArrivalDate
            ? new Date(shipmentDataForUpdate.actualArrivalDate)
            : undefined,
          totalAmount: shipmentDataForUpdate.totalAmount,
          status: shipmentDataForUpdate.status as ShipmentStatus,
          originPort: shipmentDataForUpdate.originPort,
          destinationPort: shipmentDataForUpdate.destinationPort,
          containerNumber: shipmentDataForUpdate.containerNumber || null,
          flightNumber: shipmentDataForUpdate.flightNumber || null,
          notes: shipmentDataForUpdate.notes || null,
          attachments: shipmentDataForUpdate.attachments || [],
          purchaseIds:
            shipmentDataForUpdate.purchaseIds?.length > 0
              ? shipmentDataForUpdate.purchaseIds
              : null,
          vendorIds:
            shipmentDataForUpdate.vendorIds?.length > 0
              ? shipmentDataForUpdate.vendorIds
              : null,
          updatedAt: new Date(),
        })
        .where(eq(shipmentsTable.id, shipmentId))
        .returning();

      if (!mainShipmentUpdate) {
        throw new Error("Shipment not found for update.");
      }

      // 2. Get existing parcels with their items in a single query for efficiency
      const existingParcelsWithItems = await tx
        .select({
          parcel: parcelsTable,
          item: parcelItemsTable,
        })
        .from(parcelsTable)
        .leftJoin(
          parcelItemsTable,
          eq(parcelsTable.id, parcelItemsTable.parcelId)
        )
        .where(eq(parcelsTable.shipmentId, shipmentId));

      // Group parcels with their items
      const existingParcelsMap = new Map<
        string,
        {
          parcel: typeof parcelsTable.$inferSelect;
          items: (typeof parcelItemsTable.$inferSelect)[];
        }
      >();

      existingParcelsWithItems.forEach(({ parcel, item }) => {
        if (!existingParcelsMap.has(parcel.id)) {
          existingParcelsMap.set(parcel.id, { parcel, items: [] });
        }
        if (item) {
          existingParcelsMap.get(parcel.id)!.items.push(item);
        }
      });

      const existingParcels = Array.from(existingParcelsMap.values()).map(
        (p) => p.parcel
      );

      // Create sets for efficient lookup
      const newParcelNumbers = new Set(parcels.map((p) => p.parcelNumber));
      const existingParcelNumbersMap = new Map(
        existingParcels.map((p) => [p.parcelNumber, p])
      );

      // 3. Find parcels to delete (exist in database but not in new parcels)
      const parcelsToDelete = existingParcels.filter(
        (parcel) => !newParcelNumbers.has(parcel.parcelNumber)
      );

      // Delete removed parcels and their items (cascade should handle items, but explicit delete for clarity)
      if (parcelsToDelete.length > 0) {
        const parcelIdsToDelete = parcelsToDelete.map((p) => p.id);

        // Delete parcel items first
        await tx
          .delete(parcelItemsTable)
          .where(inArray(parcelItemsTable.parcelId, parcelIdsToDelete));

        // Delete parcels
        await tx
          .delete(parcelsTable)
          .where(inArray(parcelsTable.id, parcelIdsToDelete));
      }

      // 4. Process parcels (updates and additions)
      const updatedParcels = await Promise.all(
        parcels.map(async (parcelData) => {
          const existingParcel = existingParcelNumbersMap.get(
            parcelData.parcelNumber
          );

          let currentParcel;

          if (existingParcel) {
            // Update existing parcel
            const [updatedParcel] = await tx
              .update(parcelsTable)
              .set({
                packageType: parcelData.packageType,
                length: parcelData.length,
                width: parcelData.width,
                height: parcelData.height,
                netWeight: parcelData.netWeight,
                grossWeight: parcelData.grossWeight,
                volumetricWeight: parcelData.volumetricWeight,
                chargeableWeight: parcelData.chargeableWeight,
                volumetricDivisor: parcelData.volumetricDivisor,
                description: parcelData.description || "",
                unitPricePerKg: parcelData.unitPricePerKg,
                totalAmount: parcelData.totalAmount,
                totalItems: parcelData.totalItems,
                updatedAt: new Date(),
              })
              .where(eq(parcelsTable.id, existingParcel.id))
              .returning();
            currentParcel = updatedParcel;
          } else {
            // Create new parcel
            const [newParcel] = await tx
              .insert(parcelsTable)
              .values({
                shipmentId: shipmentId,
                parcelNumber: parcelData.parcelNumber,
                packageType: parcelData.packageType,
                length: parcelData.length,
                width: parcelData.width,
                height: parcelData.height,
                netWeight: parcelData.netWeight,
                grossWeight: parcelData.grossWeight,
                volumetricWeight: parcelData.volumetricWeight,
                chargeableWeight: parcelData.chargeableWeight,
                volumetricDivisor: parcelData.volumetricDivisor,
                description: parcelData.description || "",
                unitPricePerKg: parcelData.unitPricePerKg,
                totalAmount: parcelData.totalAmount,
                totalItems: parcelData.totalItems,
              })
              .returning();
            currentParcel = newParcel;
          }

          if (!currentParcel) {
            throw new Error(
              `Failed to process parcel ${parcelData.parcelNumber}.`
            );
          }

          // 5. Handle parcel items
          const existingParcelData = existingParcelsMap.get(currentParcel.id);
          const existingItems = existingParcelData?.items || [];

          // Create identifier for items (using productID + productName for uniqueness)
          const newItemIdentifiers = new Set(
            parcelData.items.map(
              (item) => `${item.productID}_${item.productName}`
            )
          );

          const existingItemsMap = new Map(
            existingItems.map((item) => [
              `${item.productID}_${item.productName}`,
              item,
            ])
          );

          // Find items to delete
          const itemsToDelete = existingItems.filter(
            (item) =>
              !newItemIdentifiers.has(`${item.productID}_${item.productName}`)
          );

          // Delete removed items
          if (itemsToDelete.length > 0) {
            await tx.delete(parcelItemsTable).where(
              inArray(
                parcelItemsTable.id,
                itemsToDelete.map((item) => item.id)
              )
            );
          }

          // Process items (updates and additions)
          const updatedItems = await Promise.all(
            parcelData.items.map(async (itemData) => {
              const itemIdentifier = `${itemData.productID}_${itemData.productName}`;
              const existingItem = existingItemsMap.get(itemIdentifier);

              if (existingItem) {
                // Update existing item
                const [updatedItem] = await tx
                  .update(parcelItemsTable)
                  .set({
                    productId: itemData.productId || null,
                    productName: itemData.productName,
                    productUnit: itemData.productUnit,
                    quantity: itemData.quantity,
                    netWeight: itemData.netWeight,
                    isPurchaseItem: itemData.isPurchaseItem,
                    purchaseReference: itemData.purchaseReference || null,
                    updatedAt: new Date(),
                  })
                  .where(eq(parcelItemsTable.id, existingItem.id))
                  .returning();
                return updatedItem;
              } else {
                // Create new item
                const [newItem] = await tx
                  .insert(parcelItemsTable)
                  .values({
                    parcelId: currentParcel.id,
                    productId: itemData.productId || null,
                    productName: itemData.productName,
                    productID: itemData.productID,
                    productUnit: itemData.productUnit,
                    quantity: itemData.quantity,
                    netWeight: itemData.netWeight,
                    isPurchaseItem: itemData.isPurchaseItem,
                    purchaseReference: itemData.purchaseReference || null,
                  })
                  .returning();
                return newItem;
              }
            })
          );

          return { ...currentParcel, items: updatedItems };
        })
      );

      return { shipment: mainShipmentUpdate, parcels: updatedParcels };
    });

    revalidatePath("/purchases/shipments");
    revalidatePath(`/purchases/shipments/edit-shipment/${shipmentId}`);
    return parseStringify(updatedShipment);
  } catch (error) {
    console.error("Error updating shipment:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update shipment"
    );
  }
};

// Get Shipment by ID
export const getShipmentById = async (shipmentId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get main shipment record with shipping vendor
      const shipmentWithVendor = await tx
        .select({ shipment: shipmentsTable, shippingVendor: vendorsTable })
        .from(shipmentsTable)
        .leftJoin(
          vendorsTable,
          eq(shipmentsTable.shippingVendorId, vendorsTable.id)
        )
        .where(
          and(
            eq(shipmentsTable.id, shipmentId),
            eq(shipmentsTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!shipmentWithVendor) {
        return null;
      }

      const { shipment } = shipmentWithVendor;

      // Get all vendors for this shipment
      const vendorIds = shipment.vendorIds || [];
      const vendors =
        vendorIds.length > 0
          ? await tx
              .select()
              .from(vendorsTable)
              .where(
                and(
                  inArray(vendorsTable.id, vendorIds),
                  eq(vendorsTable.isActive, true)
                )
              )
          : [];

      // Get all parcels for this shipment
      const parcels = await tx
        .select()
        .from(parcelsTable)
        .where(
          and(
            eq(parcelsTable.shipmentId, shipmentId),
            eq(parcelsTable.isActive, true)
          )
        );

      // Get all parcel items for these parcels in a single query
      const parcelIds = parcels.map((p) => p.id);
      let parcelItems: ParcelItem[] = [];
      if (parcelIds.length > 0) {
        const rawParcelItems = await tx
          .select()
          .from(parcelItemsTable)
          .where(
            and(
              inArray(parcelItemsTable.parcelId, parcelIds),
              eq(parcelItemsTable.isActive, true)
            )
          );
        // Filter out items where parcelId is null and cast parcelId to string
        parcelItems = rawParcelItems
          .filter((item) => item.parcelId !== null)
          .map((item) => ({
            ...item,
            parcelId: item.parcelId as string,
          })) as ParcelItem[];
      }

      // Combine parcels with their items
      const parcelsWithItems = parcels.map((parcel) => ({
        ...parcel,
        items: parcelItems.filter((item) => item.parcelId === parcel.id),
      }));

      const combinedShipment = {
        ...shipmentWithVendor,
        vendors: vendors,
        parcels: parcelsWithItems,
      };

      return combinedShipment;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting shipment:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get shipment"
    );
  }
};

// Get All Shipments (with pagination/filters)
export const getShipments = async (
  page: number = 0,
  limit: number = 10,
  getAllShipments: boolean = false,
  filters?: ShipmentFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let shipmentsQuery = tx
        .select({ shipment: shipmentsTable, shippingVendor: vendorsTable })
        .from(shipmentsTable)
        .leftJoin(
          vendorsTable,
          eq(shipmentsTable.shippingVendorId, vendorsTable.id)
        )
        .$dynamic();

      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        shipmentsQuery = shipmentsQuery.where(and(...conditions));
      }

      shipmentsQuery = shipmentsQuery.orderBy(desc(shipmentsTable.createdAt));

      if (!getAllShipments && limit > 0) {
        shipmentsQuery = shipmentsQuery.limit(limit).offset(page * limit);
      }

      const shipments = await shipmentsQuery;

      const shipmentIds = shipments.map((s) => s.shipment.id);
      const vendorIds = shipments.map((s) => s.shipment.vendorIds);

      // Get all unique vendor IDs from all shipments
      const allVendorIds = Array.from(
        new Set(
          vendorIds.flat().filter((id): id is string => typeof id === "string")
        )
      );
      // Fetch all vendors at once
      const vendors =
        allVendorIds.length > 0
          ? await tx
              .select()
              .from(vendorsTable)
              .where(
                and(
                  inArray(vendorsTable.id, allVendorIds),
                  eq(vendorsTable.isActive, true)
                )
              )
          : [];

      const parcels = await tx
        .select()
        .from(parcelsTable)
        .where(
          and(
            inArray(parcelsTable.shipmentId, shipmentIds),
            eq(parcelsTable.isActive, true)
          )
        );

      const parcelIds = parcels.map((p) => p.id);
      const parcelItems = await tx
        .select()
        .from(parcelItemsTable)
        .where(
          and(
            inArray(parcelItemsTable.parcelId, parcelIds),
            eq(parcelItemsTable.isActive, true)
          )
        );

      const parcelsWithItems = parcels.map((parcel) => ({
        ...parcel,
        items: parcelItems
          .filter((item) => item.parcelId === parcel.id)
          .map((item) => ({
            ...item,
          })),
      }));

      const shipmentsWithParcelsAndVendors = shipments.map((shipment) => {
        // Get vendors for this specific shipment
        const shipmentVendorIds = shipment.shipment.vendorIds || [];
        const shipmentVendors = vendors.filter((vendor) =>
          shipmentVendorIds.includes(vendor.id)
        );

        return {
          ...shipment,
          vendors: shipmentVendors,
          parcels: parcelsWithItems
            .filter((parcel) => parcel.shipmentId === shipment.shipment.id)
            .map((p) => ({
              ...p,
            })),
        };
      });

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(shipmentsTable)
        .leftJoin(
          vendorsTable,
          eq(shipmentsTable.shippingVendorId, vendorsTable.id)
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllShipments
        ? shipmentsWithParcelsAndVendors.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: shipmentsWithParcelsAndVendors,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting shipments:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to get shipments"
    );
  }
};

// Permanently Delete Shipment
export const deleteShipment = async (shipmentId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // First, get all parcel IDs for the shipment
      const parcelIdsToDelete = await tx
        .select({ id: parcelsTable.id })
        .from(parcelsTable)
        .where(eq(parcelsTable.shipmentId, shipmentId));

      if (parcelIdsToDelete.length > 0) {
        // Delete all parcel items associated with these parcels
        await tx.delete(parcelItemsTable).where(
          inArray(
            parcelItemsTable.parcelId,
            parcelIdsToDelete.map((p) => p.id)
          )
        );

        // Then delete the parcels themselves
        await tx
          .delete(parcelsTable)
          .where(eq(parcelsTable.shipmentId, shipmentId));
      }

      // Finally, delete the main shipment record
      const [deletedShipment] = await tx
        .delete(shipmentsTable)
        .where(eq(shipmentsTable.id, shipmentId))
        .returning();

      return deletedShipment;
    });

    revalidatePath("/purchases/shipments");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting shipment:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete shipment"
    );
  }
};

// Soft Delete Shipment
export const softDeleteShipment = async (shipmentId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Soft delete all parcel items associated with this shipment's parcels
      const parcelIdsToSoftDelete = await tx
        .select({ id: parcelsTable.id })
        .from(parcelsTable)
        .where(eq(parcelsTable.shipmentId, shipmentId));

      if (parcelIdsToSoftDelete.length > 0) {
        await tx
          .update(parcelItemsTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            inArray(
              parcelItemsTable.parcelId,
              parcelIdsToSoftDelete.map((p) => p.id)
            )
          );

        // Soft delete parcels
        await tx
          .update(parcelsTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(parcelsTable.shipmentId, shipmentId));
      }

      // Soft delete the main shipment record
      const [updatedShipment] = await tx
        .update(shipmentsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(shipmentsTable.id, shipmentId))
        .returning();

      return updatedShipment;
    });

    revalidatePath("/purchases/shipments");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting shipment:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to soft delete shipment"
    );
  }
};

// Generate Shipment Reference Number
export const generateShipmentRefNumber = async (): Promise<string> => {
  try {
    const config = getCompanyConfig();

    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastShipment = await tx
        .select({ shipmentRefNumber: shipmentsTable.shipmentRefNumber })
        .from(shipmentsTable)
        .where(
          sql`shipment_ref_number LIKE ${`${config.reffNumberPrefix}SHP:${year}/${month}/%`}`
        )
        .orderBy(desc(shipmentsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastShipment.length > 0) {
        const lastRefNumber = lastShipment[0].shipmentRefNumber;
        const parts = lastRefNumber.split("/");
        const lastSequence = parseInt(parts[parts.length - 1] || "0", 10);
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `${config.reffNumberPrefix}SHP:${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating shipment reference number:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to generate shipment number"
    );
  }
};
