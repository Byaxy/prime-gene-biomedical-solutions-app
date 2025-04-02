"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { BrandFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { brandsTable } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

interface BrandDataWithImage extends Omit<BrandFormValues, "image"> {
  imageId: string;
  imageUrl: string;
}

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
  getAllBrands: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.isActive, true))
      .orderBy(desc(brandsTable.createdAt));

    if (!getAllBrands) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const brands = await query;

    // For getAllBrands, fetch all brands in batches (if needed)
    if (getAllBrands) {
      let allBrands: typeof brands = [];
      let offset = 0;
      const batchSize = 100; // Adjust batch size as needed

      while (true) {
        const batch = await db
          .select()
          .from(brandsTable)
          .where(eq(brandsTable.isActive, true))
          .orderBy(desc(brandsTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allBrands = [...allBrands, ...batch];

        // If we got fewer brands than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allBrands),
        total: allBrands.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(brands),
      total,
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
