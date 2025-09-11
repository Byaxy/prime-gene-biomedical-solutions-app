"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { BrandFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { brandsTable } from "@/drizzle/schema";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { BrandFilters } from "@/hooks/useBrands";

interface BrandDataWithImage extends Omit<BrandFormValues, "image"> {
  imageId: string;
  imageUrl: string;
}

const buildFilterConditions = (filters: BrandFilters) => {
  const conditions = [];

  conditions.push(eq(brandsTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(brandsTable.name, searchTerm),
        ilike(brandsTable.description, searchTerm)
      )
    );
  }

  return conditions;
};

// Add Brand
export const addBrand = async (brandData: BrandDataWithImage) => {
  try {
    const insertedBrand = await db
      .insert(brandsTable)
      .values(brandData)
      .returning();

    revalidatePath("/settings/brands");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(insertedBrand);
  } catch (error) {
    console.error("Error adding brand:", error);
    throw error;
  }
};

// Get Brand By Id
export const getBrandById = async (brandId: string) => {
  try {
    const response = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, brandId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting brand by ID:", error);
    throw error;
  }
};

// Get Brands
export const getBrands = async (
  page: number = 0,
  limit: number = 10,
  getAllBrands: boolean = false,
  filters?: BrandFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main query
      let query = tx.select().from(brandsTable).$dynamic();

      const conditions = buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(brandsTable.createdAt));

      if (!getAllBrands && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const brands = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(brandsTable)
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllBrands
        ? brands.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: brands,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting brands:", error);
    throw error;
  }
};

// Edit Brand
export const editBrand = async (brand: BrandDataWithImage, brandId: string) => {
  try {
    let updatedBrandData;

    // Only update imageId and imageUrl if provided
    if (brand.imageId && brand.imageUrl) {
      updatedBrandData = {
        name: brand.name,
        description: brand.description,
        imageId: brand.imageId,
        imageUrl: brand.imageUrl,
      };
    } else {
      updatedBrandData = {
        name: brand.name,
        description: brand.description,
      };
    }

    const updatedBrand = await db
      .update(brandsTable)
      .set(updatedBrandData)
      .where(eq(brandsTable.id, brandId))
      .returning();

    revalidatePath("/settings/brands");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedBrand);
  } catch (error) {
    console.error("Error editing brand:", error);
    throw error;
  }
};

// Permanently Delete Brand
export const deleteBrand = async (brandId: string) => {
  try {
    const deletedBrand = await db
      .delete(brandsTable)
      .where(eq(brandsTable.id, brandId))
      .returning();

    revalidatePath("/settings/brands");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(deletedBrand);
  } catch (error) {
    console.error("Error deleting brand:", error);
    throw error;
  }
};

// Soft Delete Brand
export const softDeleteBrand = async (brandId: string) => {
  try {
    const updatedBrand = await db
      .update(brandsTable)
      .set({ isActive: false })
      .where(eq(brandsTable.id, brandId))
      .returning();

    revalidatePath("/settings/brands");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedBrand);
  } catch (error) {
    console.error("Error soft deleting brand:", error);
    throw error;
  }
};
