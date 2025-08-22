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
  inArray,
  InferInsertModel,
  lte,
  sql,
} from "drizzle-orm";
import { ShipmentFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ShipmentFilters } from "@/hooks/useShipments";

type NewShipment = InferInsertModel<typeof shipmentsTable>;

// Helper to determine what to do with nested items (add, update, delete)
async function syncNestedItems<
  TExisting extends { id: string },
  TIncoming extends { id?: string | undefined },
  TTable extends typeof parcelsTable | typeof parcelItemsTable
>(
  tx: any,
  existingItems: TExisting[],
  incomingItems: TIncoming[],
  table: TTable,
  foreignKeyName: string,
  foreignKeyValue: string
) {
  const existingItemIds = new Set(existingItems.map((item) => item.id));
  const incomingItemIds = new Set(
    incomingItems.map((item) => item.id).filter(Boolean)
  );

  // Items to delete (exist in DB but not in incoming)
  const itemsToDelete = existingItems.filter(
    (existingItem) => !incomingItemIds.has(existingItem.id)
  );

  if (itemsToDelete.length > 0) {
    await tx.delete(table).where(
      inArray(
        table.id,
        itemsToDelete.map((item) => item.id)
      )
    );
  }

  // Items to add or update
  const results = await Promise.all(
    incomingItems.map(async (item) => {
      if (item.id && existingItemIds.has(item.id)) {
        // Update existing item
        // Filter out `id` and the foreign key from the update payload
        const updatePayload = {
          ...item,
        };
        delete (updatePayload as any).id; // Remove id from update payload
        delete (updatePayload as any)[foreignKeyName]; // Remove foreign key from update payload

        const [updatedItem] = await tx
          .update(table)
          .set(updatePayload)
          .where(eq(table.id, item.id))
          .returning();
        return updatedItem;
      } else {
        // Add new item
        const createPayload = {
          ...item,
          [foreignKeyName]: foreignKeyValue, // Add the foreign key
        };
        delete (createPayload as any).id; // Ensure new items don't have an ID for insert

        const [newItem] = await tx
          .insert(table)
          .values(createPayload)
          .returning();
        return newItem;
      }
    })
  );
  return results;
}

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
      // 1. Update main shipment record
      const [mainShipmentUpdate] = await tx
        .update(shipmentsTable)
        .set({
          shipmentRefNumber: data.shipmentRefNumber,
          numberOfPackages: data.numberOfPackages,
          totalItems: data.totalItems,
          shippingMode: data.shippingMode,
          shipperType: data.shipperType,
          shippingVendorId: data.shippingVendorId,
          shipperName: data.shipperName,
          shipperAddress: data.shipperAddress,
          carrierType: data.carrierType,
          carrierName: data.carrierName,
          trackingNumber: data.trackingNumber,
          shippingDate: data.shippingDate,
          estimatedArrivalDate: data.estimatedArrivalDate,
          dateShipped: data.dateShipped,
          actualArrivalDate: data.actualArrivalDate,
          totalAmount: data.totalAmount,
          status: data.status,
          originPort: data.originPort,
          destinationPort: data.destinationPort,
          containerNumber: data.containerNumber || null,
          flightNumber: data.flightNumber || null,
          notes: data.notes || null,
          attachments: data.attachments,
          purchaseIds: data.purchaseIds,
          vendorIds: data.vendorIds,
          updatedAt: new Date(),
        })
        .where(eq(shipmentsTable.id, shipmentId))
        .returning();

      if (!mainShipmentUpdate) {
        throw new Error("Shipment not found for update.");
      }

      // 2. Sync Parcels (add, update, delete)
      // Fetch existing parcels for this shipment
      const existingParcels = await tx
        .select()
        .from(parcelsTable)
        .where(eq(parcelsTable.shipmentId, shipmentId));

      const updatedParcels = await syncNestedItems(
        tx,
        existingParcels,
        data.parcels.map((parcel: any) => ({
          ...parcel,
          id: parcel.id ?? undefined,
        })),
        parcelsTable,
        "shipmentId",
        shipmentId
      );

      // 3. Sync Parcel Items for each updated/added parcel
      await Promise.all(
        updatedParcels.map(async (parcel) => {
          // Find the corresponding incoming parcel to get its items
          const incomingParcel = data.parcels.find(
            (p) => p.parcelNumber === parcel.parcelNumber
          );
          if (incomingParcel) {
            const existingParcelItems = await tx
              .select()
              .from(parcelItemsTable)
              .where(eq(parcelItemsTable.parcelId, parcel.id));

            await syncNestedItems(
              tx,
              existingParcelItems,
              incomingParcel.items.map((item: any) => ({
                ...item,
                id: item.id ?? undefined,
              })),
              parcelItemsTable,
              "parcelId",
              parcel.id
            );
          }
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

      const conditions = [eq(shipmentsTable.isActive, true)];

      if (filters) {
        if (filters.status) {
          conditions.push(eq(shipmentsTable.status, filters.status));
        }
        if (filters.shippingMode) {
          conditions.push(
            eq(shipmentsTable.shippingMode, filters.shippingMode)
          );
        }
        if (filters.carrierName) {
          conditions.push(eq(shipmentsTable.carrierName, filters.carrierName));
        }
        if (filters.trackingNumber) {
          conditions.push(
            eq(shipmentsTable.trackingNumber, filters.trackingNumber)
          );
        }
        if (filters.shippingDate_start) {
          conditions.push(
            gte(shipmentsTable.shippingDate, filters.shippingDate_start)
          );
        }
        if (filters.shippingDate_end) {
          conditions.push(
            lte(shipmentsTable.shippingDate, filters.shippingDate_end)
          );
        }
      }

      shipmentsQuery = shipmentsQuery.where(and(...conditions));
      shipmentsQuery = shipmentsQuery.orderBy(desc(shipmentsTable.createdAt));

      if (!getAllShipments) {
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

      const total = getAllShipments
        ? shipments.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(shipmentsTable)
            .where(and(...conditions))
            .then((res) => res[0]?.count || 0);

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
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastShipment = await tx
        .select({ shipmentRefNumber: shipmentsTable.shipmentRefNumber })
        .from(shipmentsTable)
        .where(sql`shipment_ref_number LIKE ${`SHP-${year}/${month}/%`}`)
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

      return `SHP-${year}/${month}/${sequenceNumber}`;
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
