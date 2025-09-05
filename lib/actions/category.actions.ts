"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { CategoryFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { categoriesTable } from "@/drizzle/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { CategoryFilters } from "@/hooks/useCategories";

const buildFilterConditionsDrizzle = (filters: CategoryFilters) => {
  const conditions = [];

  conditions.push(eq(categoriesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(categoriesTable.name, searchTerm),
        ilike(categoriesTable.description, searchTerm)
      )
    );
  }

  return conditions;
};

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
  getAllCategories: boolean = false,
  filters?: CategoryFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main query
      let query = tx.select().from(categoriesTable).$dynamic();

      const conditions = buildFilterConditionsDrizzle(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(categoriesTable.createdAt));

      if (!getAllCategories && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const categories = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(categoriesTable)
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllCategories
        ? categories.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: categories,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
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
