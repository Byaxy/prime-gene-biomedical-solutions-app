"use server";

import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { VendorFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { vendorsTable } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

// Get Vendors
export const getVendors = async (
  page: number = 0,
  limit: number = 10,
  getAllVendors: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.isActive, true))
      .orderBy(desc(vendorsTable.createdAt));

    if (!getAllVendors) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const vendors = await query;

    // For getAllVendors, fetch all vendors in batches (if needed)
    if (getAllVendors) {
      let allVendors: typeof vendors = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select()
          .from(vendorsTable)
          .where(eq(vendorsTable.isActive, true))
          .orderBy(desc(vendorsTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allVendors = [...allVendors, ...batch];

        // If we got fewer vendors than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allVendors),
        total: allVendors.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(vendors),
      total,
    };
  } catch (error) {
    console.error("Error getting vendors:", error);
    throw error;
  }
};

// Get Vendor by ID
export const getVendorById = async (vendorId: string) => {
  try {
    const response = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, vendorId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting vendor by ID:", error);
    throw error;
  }
};

// Add Vendor
export const addVendor = async (vendorData: VendorFormValues) => {
  try {
    const insertedVendor = await db
      .insert(vendorsTable)
      .values(vendorData)
      .returning();

    revalidatePath("/vendors");
    return parseStringify(insertedVendor);
  } catch (error) {
    console.error("Error adding vendor:", error);
    throw error;
  }
};

// Edit Vendor
export const editVendor = async (
  vendorData: VendorFormValues,
  vendorId: string
) => {
  try {
    const updatedVendor = await db
      .update(vendorsTable)
      .set(vendorData)
      .where(eq(vendorsTable.id, vendorId))
      .returning();

    revalidatePath("/vendors");
    return parseStringify(updatedVendor);
  } catch (error) {
    console.error("Error editing vendor:", error);
    throw error;
  }
};

// Permanently Delete Vendor
export const deleteVendor = async (vendorId: string) => {
  try {
    const deletedVendor = await db
      .delete(vendorsTable)
      .where(eq(vendorsTable.id, vendorId))
      .returning();

    revalidatePath("/vendors");
    return parseStringify(deletedVendor);
  } catch (error) {
    console.error("Error deleting vendor:", error);
    throw error;
  }
};

// Soft Delete Vendor
export const softDeleteVendor = async (vendorId: string) => {
  try {
    const updatedVendor = await db
      .update(vendorsTable)
      .set({ isActive: false })
      .where(eq(vendorsTable.id, vendorId))
      .returning();

    revalidatePath("/vendors");
    return parseStringify(updatedVendor);
  } catch (error) {
    console.error("Error soft deleting vendor:", error);
    throw error;
  }
};
