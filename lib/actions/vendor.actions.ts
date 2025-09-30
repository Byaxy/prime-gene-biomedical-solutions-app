"use server";

import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { VendorFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { vendorsTable } from "@/drizzle/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { VendorFilters } from "@/hooks/useVendors";

const buildFilterConditions = (filters: VendorFilters) => {
  const conditions = [];

  conditions.push(eq(vendorsTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(vendorsTable.name, searchTerm),
        ilike(vendorsTable.phone, searchTerm),
        ilike(vendorsTable.email, searchTerm)
      )
    );
  }

  return conditions;
};

// Get Vendors
export const getVendors = async (
  page: number = 0,
  limit: number = 10,
  getAllVendors: boolean = false,
  filters?: VendorFilters
) => {
  try {
    let query = db.select().from(vendorsTable).$dynamic();

    const conditions = await buildFilterConditions(filters ?? {});

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(vendorsTable.createdAt));

    if (!getAllVendors && limit > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const vendors = await query;

    // Get total count for pagination
    let totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(vendorsTable)
      .$dynamic();

    if (conditions.length > 0) {
      totalQuery = totalQuery.where(and(...conditions));
    }

    const total = vendors
      ? vendors.length
      : await totalQuery.then((res) => res[0]?.count || 0);

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
