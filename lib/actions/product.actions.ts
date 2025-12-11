/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ProductFormValues } from "../validation";
import { db } from "@/drizzle/db";
import {
  backordersTable,
  brandsTable,
  categoriesTable,
  inventoryTable,
  productsTable,
  productTypesTable,
  unitsTable,
} from "@/drizzle/schema";
import {
  and,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { ProductFilters } from "@/hooks/useProducts";

interface ProductDataWithImage extends Omit<ProductFormValues, "image"> {
  imageId: string;
  imageUrl: string;
}

// --- buildFilterConditions Function ---
const buildFilterConditions = async (filters: ProductFilters) => {
  const conditions = [];

  // Cost price range
  if (filters.costPrice_min !== undefined) {
    conditions.push(gte(productsTable.costPrice, filters.costPrice_min));
  }
  if (filters.costPrice_max !== undefined) {
    conditions.push(lte(productsTable.costPrice, filters.costPrice_max));
  }

  // Selling price range
  if (filters.sellingPrice_min !== undefined) {
    conditions.push(gte(productsTable.sellingPrice, filters.sellingPrice_min));
  }
  if (filters.sellingPrice_max !== undefined) {
    conditions.push(lte(productsTable.sellingPrice, filters.sellingPrice_max));
  }

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    const searchConditions = [
      ilike(productsTable.name, searchTerm),
      ilike(productsTable.productID, searchTerm),
      ilike(productsTable.description, searchTerm),
      ilike(brandsTable.name, searchTerm),
      ilike(productTypesTable.name, searchTerm),
      ilike(unitsTable.name, searchTerm),
      ilike(categoriesTable.name, searchTerm),
    ];

    const matchingCategories = await db.query.categoriesTable.findMany({
      where: ilike(categoriesTable.name, searchTerm),
      columns: {
        id: true,
      },
    });

    let allRelevantCategoryIdsForSearch: string[] = matchingCategories.map(
      (c) => c.id
    );

    if (matchingCategories.length > 0) {
      const descendantConditions = allRelevantCategoryIdsForSearch.map((id) =>
        ilike(categoriesTable.path, `${id}%`)
      );

      const descendantCategories = await db.query.categoriesTable.findMany({
        where: or(...descendantConditions),
        columns: {
          id: true,
        },
      });

      allRelevantCategoryIdsForSearch = allRelevantCategoryIdsForSearch.concat(
        descendantCategories.map((c) => c.id)
      );
      allRelevantCategoryIdsForSearch = [
        ...new Set(allRelevantCategoryIdsForSearch),
      ];
    }

    if (allRelevantCategoryIdsForSearch.length > 0) {
      searchConditions.push(
        inArray(productsTable.categoryId, allRelevantCategoryIdsForSearch)
      );
    }
    conditions.push(or(...searchConditions));
  }
  // isActive filter
  if (filters.isActive !== undefined && filters.isActive !== "all") {
    conditions.push(eq(productsTable.isActive, filters.isActive === "true"));
  }

  // Foreign key filters
  if (filters.categoryId) {
    const targetCategory = await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.id, filters.categoryId),
      columns: {
        id: true,
        path: true,
      },
    });

    if (targetCategory) {
      let matchingCategoryIds: string[] = [targetCategory.id];

      const pathCondition =
        targetCategory.path === null || targetCategory.path === ""
          ? ilike(categoriesTable.path, `${targetCategory.id}%`)
          : ilike(
              categoriesTable.path,
              `${targetCategory.path}/${targetCategory.id}%`
            );

      const descendantCategories = await db.query.categoriesTable.findMany({
        where: pathCondition,
        columns: {
          id: true,
        },
      });

      matchingCategoryIds = matchingCategoryIds.concat(
        descendantCategories.map((c) => c.id)
      );

      conditions.push(
        inArray(productsTable.categoryId, [...new Set(matchingCategoryIds)])
      );
    } else {
      conditions.push(sql`false`);
    }
  }

  if (filters.typeId) {
    conditions.push(eq(productsTable.typeId, filters.typeId));
  }
  if (filters.brandId) {
    conditions.push(eq(productsTable.brandId, filters.brandId));
  }
  if (filters.unitId) {
    conditions.push(eq(productsTable.unitId, filters.unitId));
  }

  return conditions;
};

// --- addProduct Function ---
export const addProduct = async (productData: ProductDataWithImage) => {
  try {
    // Basic validation (e.g., uniqueness of productID)
    const existingProduct = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.productID, productData.productID));

    if (existingProduct.length > 0) {
      throw new Error(`Product ID "${productData.productID}" already exists.`);
    }

    // Insert new product record (excluding the removed 'quantity' field)
    const insertedProduct = await db
      .insert(productsTable)
      .values({
        ...productData,
        typeId: productData.typeId || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    revalidatePath("/inventory");
    return parseStringify(insertedProduct);
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

// --- getProducts Function ---
export const getProducts = async (
  page: number = 0,
  limit: number = 10,
  getAllProducts: boolean = false,
  filters?: ProductFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Define common columns for GROUP BY clause.
      const commonGroupByColumns = [
        productsTable.id,
        productsTable.productID,
        productsTable.name,
        productsTable.alertQuantity,
        productsTable.maxAlertQuantity,
        productsTable.costPrice,
        productsTable.sellingPrice,
        productsTable.description,
        productsTable.imageId,
        productsTable.imageUrl,
        productsTable.isActive,
        productsTable.createdAt,
        productsTable.updatedAt,
        categoriesTable.id,
        categoriesTable.name,
        categoriesTable.description,
        categoriesTable.path,
        categoriesTable.parentId,
        categoriesTable.isActive,
        categoriesTable.createdAt,
        categoriesTable.updatedAt,
        brandsTable.id,
        brandsTable.name,
        brandsTable.description,
        brandsTable.isActive,
        brandsTable.createdAt,
        brandsTable.updatedAt,
        productTypesTable.id,
        productTypesTable.name,
        productTypesTable.description,
        productTypesTable.isActive,
        productTypesTable.createdAt,
        productTypesTable.updatedAt,
        unitsTable.id,
        unitsTable.name,
        unitsTable.code,
        unitsTable.description,
        unitsTable.isActive,
        unitsTable.createdAt,
        unitsTable.updatedAt,
      ];

      // Build the main products query with aggregate calculations for quantities.
      let productsQuery = tx
        .select({
          product: productsTable,
          category: categoriesTable,
          brand: brandsTable,
          type: productTypesTable,
          unit: unitsTable,
          totalInventoryStockQuantity: sql<number>`COALESCE(SUM(${inventoryTable.quantity}), 0)`,
          totalBackorderStockQuantity: sql<number>`COALESCE(SUM(${backordersTable.pendingQuantity}), 0)`,
        })
        .from(productsTable)
        .leftJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.id)
        )
        .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
        .leftJoin(
          productTypesTable,
          eq(productsTable.typeId, productTypesTable.id)
        )
        .leftJoin(unitsTable, eq(productsTable.unitId, unitsTable.id))
        .leftJoin(
          inventoryTable,
          and(
            eq(productsTable.id, inventoryTable.productId),
            eq(inventoryTable.isActive, true),
            gte(inventoryTable.quantity, 0)
          )
        )
        .leftJoin(
          backordersTable,
          and(
            eq(productsTable.id, backordersTable.productId),
            eq(backordersTable.isActive, true),
            gt(backordersTable.pendingQuantity, 0)
          )
        )
        .$dynamic();

      // Apply filters
      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        productsQuery = productsQuery.where(and(...conditions));
      }

      // Group by all non-aggregate columns
      productsQuery = productsQuery
        .groupBy(...commonGroupByColumns)
        .orderBy(desc(productsTable.createdAt));

      // Apply pagination if not getting all products
      if (!getAllProducts && limit > 0) {
        productsQuery = productsQuery.limit(limit).offset(page * limit);
      }

      const products = await productsQuery;

      // Map the results to the desired `ProductWithRelations` structure
      const productsWithCalculatedQuantity = products.map((p) => ({
        ...p,
        product: {
          ...p.product,
          derivedQuantity: Number(p.totalInventoryStockQuantity),
        },
        totalInventoryStockQuantity: Number(p.totalInventoryStockQuantity),
        totalBackorderStockQuantity: Number(p.totalBackorderStockQuantity),
        totalQuantityOnHand:
          Number(p.totalInventoryStockQuantity) -
          Number(p.totalBackorderStockQuantity),
      }));

      // Get total count for pagination (count DISTINCT products to avoid overcounting due to joins)
      let totalQuery = tx
        .select({ count: sql<number>`count(DISTINCT ${productsTable.id})` })
        .from(productsTable)
        .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
        .leftJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.id)
        )
        .leftJoin(
          productTypesTable,
          eq(productsTable.typeId, productTypesTable.id)
        )
        .leftJoin(unitsTable, eq(productsTable.unitId, unitsTable.id))
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllProducts
        ? productsWithCalculatedQuantity.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: productsWithCalculatedQuantity,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting products:", error);
    throw error;
  }
};

// --- getProductById Function ---
export const getProductById = async (productId: string) => {
  try {
    const commonGroupByColumns = [
      productsTable.id,
      productsTable.productID,
      productsTable.name,
      productsTable.alertQuantity,
      productsTable.maxAlertQuantity,
      productsTable.costPrice,
      productsTable.sellingPrice,
      productsTable.description,
      productsTable.imageId,
      productsTable.imageUrl,
      productsTable.isActive,
      productsTable.createdAt,
      productsTable.updatedAt,
      categoriesTable.id,
      categoriesTable.name,
      categoriesTable.description,
      categoriesTable.path,
      categoriesTable.parentId,
      categoriesTable.isActive,
      categoriesTable.createdAt,
      categoriesTable.updatedAt,
      brandsTable.id,
      brandsTable.name,
      brandsTable.description,
      brandsTable.isActive,
      brandsTable.createdAt,
      brandsTable.updatedAt,
      productTypesTable.id,
      productTypesTable.name,
      productTypesTable.description,
      productTypesTable.isActive,
      productTypesTable.createdAt,
      productTypesTable.updatedAt,
      unitsTable.id,
      unitsTable.name,
      unitsTable.code,
      unitsTable.description,
      unitsTable.isActive,
      unitsTable.createdAt,
      unitsTable.updatedAt,
    ];

    const result = await db.transaction(async (tx) => {
      const response = await tx
        .select({
          product: productsTable,
          category: categoriesTable,
          brand: brandsTable,
          type: productTypesTable,
          unit: unitsTable,
          totalInventoryStockQuantity: sql<number>`COALESCE(SUM(${inventoryTable.quantity}), 0)`,
          totalBackorderStockQuantity: sql<number>`COALESCE(SUM(${backordersTable.pendingQuantity}), 0)`,
        })
        .from(productsTable)
        .leftJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.id)
        )
        .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
        .leftJoin(
          productTypesTable,
          eq(productsTable.typeId, productTypesTable.id)
        )
        .leftJoin(unitsTable, eq(productsTable.unitId, unitsTable.id))
        .leftJoin(
          inventoryTable,
          and(
            eq(productsTable.id, inventoryTable.productId),
            eq(inventoryTable.isActive, true),
            gte(inventoryTable.quantity, 0)
          )
        )
        .leftJoin(
          backordersTable,
          and(
            eq(productsTable.id, backordersTable.productId),
            eq(backordersTable.isActive, true),
            gt(backordersTable.pendingQuantity, 0)
          )
        )
        .where(eq(productsTable.id, productId))
        .groupBy(...commonGroupByColumns)
        .then((res) => res[0]);

      if (!response) {
        return null;
      }

      // Map the result to include derived quantities
      return {
        ...response,
        product: {
          ...response.product,
          derivedQuantity: Number(response.totalInventoryStockQuantity),
        },
        totalInventoryStockQuantity: Number(
          response.totalInventoryStockQuantity
        ),
        totalBackorderStockQuantity: Number(
          response.totalBackorderStockQuantity
        ),
        totalQuantityOnHand:
          Number(response.totalInventoryStockQuantity) -
          Number(response.totalBackorderStockQuantity),
      };
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting product by ID:", error);
    throw error;
  }
};

// --- editProduct Function ---
export const editProduct = async (
  productData: ProductDataWithImage,
  productId: string
) => {
  try {
    // Validate uniqueness of productID (excluding current product)
    const existingProduct = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.productID, productData.productID),
          ne(productsTable.id, productId)
        )
      );

    if (existingProduct.length > 0) {
      throw new Error(`Product ID "${productData.productID}" already exists.`);
    }

    let updatedProductData;

    //  Prepare update data
    if (productData.imageId && productData.imageUrl) {
      updatedProductData = {
        productID: productData.productID,
        name: productData.name,
        alertQuantity: productData.alertQuantity,
        maxAlertQuantity: productData.maxAlertQuantity,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        categoryId: productData.categoryId,
        typeId: productData.typeId || null,
        brandId: productData.brandId,
        unitId: productData.unitId,
        description: productData.description,
        imageId: productData.imageId,
        imageUrl: productData.imageUrl,
        updatedAt: new Date(),
      };
    } else {
      updatedProductData = {
        productID: productData.productID,
        name: productData.name,
        alertQuantity: productData.alertQuantity,
        maxAlertQuantity: productData.maxAlertQuantity,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        categoryId: productData.categoryId,
        typeId: productData.typeId || null,
        brandId: productData.brandId,
        unitId: productData.unitId,
        description: productData.description,
        updatedAt: new Date(),
      };
    }

    // 3. Perform the update
    const updatedProduct = await db
      .update(productsTable)
      .set(updatedProductData)
      .where(eq(productsTable.id, productId))
      .returning();

    revalidatePath("/inventory");
    revalidatePath(`/inventory/edit-inventory/${productId}`);
    // Return only the updated product data
    return parseStringify(updatedProduct);
  } catch (error) {
    console.error("Error editing product:", error);
    throw error;
  }
};

// --- deleteProduct Function ---
export const deleteProduct = async (productId: string) => {
  try {
    // Delete the product record
    const deletedProduct = await db
      .delete(productsTable)
      .where(eq(productsTable.id, productId))
      .returning();

    revalidatePath("/inventory");
    return parseStringify(deletedProduct);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// --- softDeleteProduct Function ---
export const softDeleteProduct = async (productId: string) => {
  try {
    // Update product status to inactive
    const updatedProduct = await db
      .update(productsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(productsTable.id, productId))
      .returning();

    revalidatePath("/inventory");
    return parseStringify(updatedProduct);
  } catch (error) {
    console.error("Error soft deleting product:", error);
    throw error;
  }
};

// --- reactivateProduct Function ---
export const reactivateProduct = async (productId: string) => {
  try {
    // Update product status to active
    const updatedProduct = await db
      .update(productsTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(productsTable.id, productId))
      .returning();

    revalidatePath("/inventory");
    return parseStringify(updatedProduct);
  } catch (error) {
    console.error("Error reactivating product:", error);
    throw error;
  }
};

// --- reactivateMultipleProducts Function ---
export const reactivateMultipleProducts = async (productIds: string[]) => {
  try {
    if (!productIds || productIds.length === 0) {
      return parseStringify([]);
    }

    const reactivatedProducts = await db.transaction(async (tx) => {
      // Batch update product statuses to active
      const results = await tx
        .update(productsTable)
        .set({ isActive: true, updatedAt: new Date() })
        .where(inArray(productsTable.id, productIds))
        .returning();

      return results;
    });

    revalidatePath("/inventory");
    return parseStringify(reactivatedProducts);
  } catch (error) {
    console.error("Error reactivating multiple products:", error);
    throw error;
  }
};

// --- bulkAddProducts Function ---
export const bulkAddProducts = async (
  products: (ProductFormValues & { id?: string; productID: string })[]
) => {
  try {
    // Early validation: Check for duplicate product IDs in input
    const productIDSet = new Set<string>();
    const duplicateIDs: string[] = [];

    for (const product of products) {
      if (productIDSet.has(product.productID)) {
        duplicateIDs.push(product.productID);
      }
      productIDSet.add(product.productID);
    }

    if (duplicateIDs.length) {
      throw new Error(
        `Duplicate product IDs in upload: ${duplicateIDs.join(", ")}`
      );
    }

    // Separate products for create vs update operations
    const productsToUpdate = products.filter((p) => p.id);
    const productsToCreate = products.filter((p) => !p.id);

    // Validate foreign key references for all products (optimized batch fetch)
    const allCategoryIds = [
      ...new Set(products.map((p) => p.categoryId).filter(Boolean)),
    ];
    const allTypeIds = [
      ...new Set(products.map((p) => p.typeId).filter(Boolean)),
    ];
    const allBrandIds = [
      ...new Set(products.map((p) => p.brandId).filter(Boolean)),
    ];
    const allUnitIds = [
      ...new Set(products.map((p) => p.unitId).filter(Boolean)),
    ];

    const [existingCategories, existingTypes, existingBrands, existingUnits] =
      await Promise.all([
        allCategoryIds.length
          ? db
              .select({ id: categoriesTable.id })
              .from(categoriesTable)
              .where(inArray(categoriesTable.id, allCategoryIds))
          : [],
        allTypeIds.length
          ? db
              .select({ id: productTypesTable.id })
              .from(productTypesTable)
              .where(
                inArray(
                  productTypesTable.id,
                  allTypeIds.filter(
                    (id): id is string => typeof id === "string"
                  )
                )
              )
          : [],
        allBrandIds.length
          ? db
              .select({ id: brandsTable.id })
              .from(brandsTable)
              .where(inArray(brandsTable.id, allBrandIds))
          : [],
        allUnitIds.length
          ? db
              .select({ id: unitsTable.id })
              .from(unitsTable)
              .where(inArray(unitsTable.id, allUnitIds))
          : [],
      ]);

    // Check for missing foreign key references
    const existingCategoryIds = new Set(existingCategories.map((c) => c.id));
    const existingTypeIds = new Set(existingTypes.map((t) => t.id));
    const existingBrandIds = new Set(existingBrands.map((b) => b.id));
    const existingUnitIds = new Set(existingUnits.map((u) => u.id));

    const missingCategories = allCategoryIds.filter(
      (id) => !existingCategoryIds.has(id)
    );
    const missingTypes = allTypeIds
      .filter((id): id is string => typeof id === "string")
      .filter((id) => !existingTypeIds.has(id));
    const missingBrands = allBrandIds.filter((id) => !existingBrandIds.has(id));
    const missingUnits = allUnitIds.filter((id) => !existingUnitIds.has(id));

    const validationErrors = [];
    if (missingCategories.length)
      validationErrors.push(
        `Invalid category IDs: ${missingCategories.join(", ")}`
      );
    if (missingTypes.length)
      validationErrors.push(`Invalid type IDs: ${missingTypes.join(", ")}`);
    if (missingBrands.length)
      validationErrors.push(`Invalid brand IDs: ${missingBrands.join(", ")}`);
    if (missingUnits.length)
      validationErrors.push(`Invalid unit IDs: ${missingUnits.join(", ")}`);

    if (validationErrors.length) {
      throw new Error(validationErrors.join("; "));
    }

    // Batch check for existing productIDs for products to create
    if (productsToCreate.length > 0) {
      const productIDsToCheck = productsToCreate.map((p) => p.productID);
      const existingProducts = await db
        .select({ productID: productsTable.productID })
        .from(productsTable)
        .where(inArray(productsTable.productID, productIDsToCheck));

      if (existingProducts.length) {
        throw new Error(
          `Product IDs already exist: ${existingProducts
            .map((p) => p.productID)
            .join(", ")}`
        );
      }
    }

    // Process in a single transaction with batch operations
    const result = await db.transaction(async (tx) => {
      const results = {
        createdProducts: [] as any[],
        updatedProducts: [] as any[],
      };

      // Batch insert new products
      if (productsToCreate.length > 0) {
        const productsData = productsToCreate.map((product) => ({
          ...product,
          typeId: product.typeId || null,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        const createdProducts = await tx
          .insert(productsTable)
          .values(productsData)
          .returning();

        results.createdProducts = createdProducts;
      }

      // Batch update existing products
      if (productsToUpdate.length > 0) {
        const BATCH_SIZE = 100;

        for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
          const batch = productsToUpdate.slice(i, i + BATCH_SIZE);

          const updatedBatch = await Promise.all(
            batch.map(async (product) => {
              if (!product.id) return null;

              const updated = await tx
                .update(productsTable)
                .set({
                  productID: product.productID,
                  name: product.name,
                  description: product.description,
                  costPrice: product.costPrice,
                  sellingPrice: product.sellingPrice,
                  alertQuantity: product.alertQuantity,
                  maxAlertQuantity: product.maxAlertQuantity,
                  categoryId: product.categoryId,
                  typeId: product.typeId || null,
                  brandId: product.brandId,
                  unitId: product.unitId,
                  updatedAt: new Date(),
                })
                .where(eq(productsTable.id, product.id))
                .returning();

              return updated[0];
            })
          );

          results.updatedProducts.push(...updatedBatch.filter(Boolean));
        }
      }

      return results;
    });

    revalidatePath("/inventory");

    return {
      success: true,
      createdCount: result.createdProducts.length,
      updatedCount: result.updatedProducts.length,
    };
  } catch (error) {
    console.error("Error in bulkAddProducts:", error);
    throw error;
  }
};

// --- softDeleteMultipleProducts Function ---
export const softDeleteMultipleProducts = async (productIds: string[]) => {
  try {
    if (!productIds || productIds.length === 0) {
      return parseStringify([]);
    }

    const deletedProducts = await db.transaction(async (tx) => {
      // Batch update product statuses to inactive
      const results = await tx
        .update(productsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(inArray(productsTable.id, productIds))
        .returning();

      return results;
    });

    revalidatePath("/inventory");
    return parseStringify(deletedProducts);
  } catch (error) {
    console.error("Error deleting multiple products:", error);
    throw error;
  }
};

// --- deleteMultipleProducts Function ---
export const deleteMultipleProducts = async (productIds: string[]) => {
  try {
    if (!productIds || productIds.length === 0) {
      return parseStringify([]);
    }

    const deletedProducts = await db.transaction(async (tx) => {
      // Batch delete product records
      const results = await tx
        .delete(productsTable)
        .where(inArray(productsTable.id, productIds))
        .returning();

      return results;
    });

    revalidatePath("/inventory");
    return parseStringify(deletedProducts);
  } catch (error) {
    console.error("Error deleting multiple products:", error);
    throw error;
  }
};
