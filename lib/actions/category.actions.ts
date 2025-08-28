"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { CategoryFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { categoriesTable } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// Add Category
export const addCategory = async (categoryData: CategoryFormValues) => {
  try {
    let path = "";
    let depth = 0;

    // If the category has a parent, calculate the path and depth
    if (categoryData.parentId) {
      const parentCategory = await db
        .select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, categoryData.parentId),
            eq(categoriesTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }

      // Build the path and depth
      path = parentCategory.path
        ? `${parentCategory.path}/${parentCategory.id}`
        : parentCategory.id;
      depth = parentCategory.depth ? parentCategory.depth + 1 : 1;
    }

    // Insert the new category
    const insertedCategory = await db
      .insert(categoriesTable)
      .values({
        ...categoryData,
        path,
        depth,
      })
      .returning();

    revalidatePath("/settings/categories");
    return parseStringify(insertedCategory);
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

// Get Categories
export const getCategories = async (
  page: number = 0,
  limit: number = 10,
  getAllCategories: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.isActive, true))
      .orderBy(desc(categoriesTable.createdAt));

    if (!getAllCategories) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const categories = await query;

    // For getAllCategories, fetch all categories in batches (if needed)
    if (getAllCategories) {
      let allCategories: typeof categories = [];
      let offset = 0;
      const batchSize = 100; // Adjust batch size as needed

      while (true) {
        const batch = await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.isActive, true))
          .orderBy(desc(categoriesTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allCategories = [...allCategories, ...batch];

        // If we got fewer categories than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allCategories),
        total: allCategories.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(categories),
      total,
    };
  } catch (error) {
    console.error("Error getting categories:", error);
    throw error;
  }
};

// Get Category by ID
export const getCategoryById = async (categoryId: string) => {
  try {
    const response = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting category by ID:", error);
    throw error;
  }
};

// Edit Category
export const editCategory = async (
  categoryData: CategoryFormValues,
  categoryId: string
) => {
  try {
    let path = "";
    let depth = 0;

    // If the category has a parent, calculate the path and depth
    if (categoryData.parentId) {
      const parentCategory = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryData.parentId))
        .then((res) => res[0]);

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }

      // Prevent a category from referencing itself as the parent
      if (parentCategory.id === categoryId) {
        throw new Error("A category cannot reference itself as the parent");
      }

      // Build the path and depth
      path = parentCategory.path
        ? `${parentCategory.path}/${parentCategory.id}`
        : parentCategory.id;
      depth = parentCategory.depth ? parentCategory.depth + 1 : 1;
    }

    // Update the category
    const updatedCategory = await db
      .update(categoriesTable)
      .set({
        ...categoryData,
        path,
        depth,
      })
      .where(eq(categoriesTable.id, categoryId))
      .returning();

    revalidatePath("/settings/categories");
    return parseStringify(updatedCategory);
  } catch (error) {
    console.error("Error editing category:", error);
    throw error;
  }
};

// Permanently Delete Category
export const deleteCategory = async (categoryId: string) => {
  try {
    const deletedCategory = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .returning();

    revalidatePath("/settings/categories");
    return parseStringify(deletedCategory);
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// Soft Delete Category
export const softDeleteCategory = async (categoryId: string) => {
  try {
    const updatedCategory = await db
      .update(categoriesTable)
      .set({ isActive: false })
      .where(eq(categoriesTable.id, categoryId))
      .returning();

    revalidatePath("/settings/categories");
    return parseStringify(updatedCategory);
  } catch (error) {
    console.error("Error soft deleting category:", error);
    throw error;
  }
};
