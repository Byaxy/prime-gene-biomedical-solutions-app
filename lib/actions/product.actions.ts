"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ProductFormValues } from "../validation";
import { db } from "@/drizzle/db";
import {
  brandsTable,
  categoriesTable,
  productsTable,
  productTypesTable,
  taxRatesTable,
  unitsTable,
} from "@/drizzle/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";

interface ProductDataWithImage extends Omit<ProductFormValues, "image"> {
  imageId: string;
  imageUrl: string;
}

// Add Product
export const addProduct = async (productData: ProductDataWithImage) => {
  try {
    const insertedProduct = await db
      .insert(productsTable)
      .values(productData)
      .returning();

    revalidatePath("/inventory");
    return parseStringify(insertedProduct);
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

// Get Products with relations
export const getProducts = async (
  page: number = 0,
  limit: number = 10,
  getAllProducts: boolean = false
) => {
  try {
    let query = db
      .select({
        product: productsTable,
        category: {
          id: categoriesTable.id,
          name: categoriesTable.name,
        },
        brand: {
          id: brandsTable.id,
          name: brandsTable.name,
        },
        type: {
          id: productTypesTable.id,
          name: productTypesTable.name,
        },
        unit: {
          id: unitsTable.id,
          name: unitsTable.name,
          code: unitsTable.code,
        },
        taxRate: {
          id: taxRatesTable.id,
          name: taxRatesTable.name,
          taxRate: taxRatesTable.taxRate,
        },
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
      .leftJoin(taxRatesTable, eq(productsTable.taxRateId, taxRatesTable.id))
      .where(eq(productsTable.isActive, true))
      .orderBy(desc(productsTable.createdAt));

    if (!getAllProducts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const products = await query;

    // For getAllProducts, fetch all products in batches (if needed)
    if (getAllProducts) {
      let allProducts: typeof products = [];
      let offset = 0;
      const batchSize = 100; // Adjust batch size as needed

      while (true) {
        const batch = await db
          .select({
            product: productsTable,
            category: {
              id: categoriesTable.id,
              name: categoriesTable.name,
            },
            brand: {
              id: brandsTable.id,
              name: brandsTable.name,
            },
            type: {
              id: productTypesTable.id,
              name: productTypesTable.name,
            },
            unit: {
              id: unitsTable.id,
              name: unitsTable.name,
              code: unitsTable.code,
            },
            taxRate: {
              id: taxRatesTable.id,
              name: taxRatesTable.name,
              taxRate: taxRatesTable.taxRate,
            },
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
            taxRatesTable,
            eq(productsTable.taxRateId, taxRatesTable.id)
          )
          .where(eq(productsTable.isActive, true))
          .orderBy(desc(productsTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allProducts = [...allProducts, ...batch];

        // If we got fewer products than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allProducts),
        total: allProducts.length,
      };
    }

    // For paginated results
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(eq(productsTable.isActive, true))
      .then((res) => res[0]?.count || 0);

    return {
      documents: parseStringify(products),
      total,
    };
  } catch (error) {
    console.error("Error getting products:", error);
    throw error;
  }
};

// Get Product by ID with relations
export const getProductById = async (productId: string) => {
  try {
    const response = await db
      .select({
        product: productsTable,
        category: {
          id: categoriesTable.id,
          name: categoriesTable.name,
        },
        brand: {
          id: brandsTable.id,
          name: brandsTable.name,
        },
        type: {
          id: productTypesTable.id,
          name: productTypesTable.name,
        },
        unit: {
          id: unitsTable.id,
          name: unitsTable.name,
          code: unitsTable.code,
        },
        taxRate: {
          id: taxRatesTable.id,
          name: taxRatesTable.name,
          taxRate: taxRatesTable.taxRate,
        },
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
      .leftJoin(taxRatesTable, eq(productsTable.taxRateId, taxRatesTable.id))
      .where(eq(productsTable.id, productId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting product by ID:", error);
    throw error;
  }
};

// Edit Product
export const editProduct = async (
  productData: ProductDataWithImage,
  productId: string
) => {
  try {
    let updatedProductData;

    if (productData.imageId && productData.imageUrl) {
      updatedProductData = {
        productID: productData.productID,
        name: productData.name,
        alertQuantity: productData.alertQuantity,
        quantity: productData.quantity,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        taxRateId: productData.taxRateId,
        categoryId: productData.categoryId,
        brandId: productData.brandId,
        typeId: productData.typeId,
        unitId: productData.unitId,
        description: productData.description,
        imageId: productData.imageId,
        imageUrl: productData.imageUrl,
      };
    } else {
      updatedProductData = {
        productID: productData.productID,
        name: productData.name,
        alertQuantity: productData.alertQuantity,
        quantity: productData.quantity,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        taxRateId: productData.taxRateId,
        categoryId: productData.categoryId,
        brandId: productData.brandId,
        typeId: productData.typeId,
        unitId: productData.unitId,
        description: productData.description,
      };
    }

    const updatedProduct = await db
      .update(productsTable)
      .set(updatedProductData)
      .where(eq(productsTable.id, productId))
      .returning();

    revalidatePath("/inventory");
    revalidatePath(`/inventory/edit-inventory/${productId}`);
    return parseStringify(updatedProduct);
  } catch (error) {
    console.error("Error editing product:", error);
    throw error;
  }
};

// Permanently Delete Product
export const deleteProduct = async (productId: string) => {
  try {
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

// Soft Delete Product
export const softDeleteProduct = async (productId: string) => {
  try {
    const updatedProduct = await db
      .update(productsTable)
      .set({ isActive: false })
      .where(eq(productsTable.id, productId))
      .returning();

    revalidatePath("/inventory");
    return parseStringify(updatedProduct);
  } catch (error) {
    console.error("Error soft deleting product:", error);
    throw error;
  }
};

// Bulck Products Upload.
export const bulkAddProducts = async (
  products: (ProductFormValues & { id?: string; productID: string })[]
) => {
  try {
    const productsToUpdate = products.filter((p) => p.id);
    const productsToCreate = products.filter((p) => !p.id);

    const productIDs = products.map((p) => p.productID!);
    const duplicateIDs = productIDs.filter(
      (id, index) => productIDs.indexOf(id) !== index
    );

    if (duplicateIDs.length) {
      throw new Error(
        `Duplicate product IDs in upload: ${duplicateIDs.join(", ")}`
      );
    }

    if (productsToCreate.length > 0) {
      const existingProducts = await db
        .select({ productID: productsTable.productID })
        .from(productsTable)
        .where(
          inArray(
            productsTable.productID,
            productsToCreate.map((p) => p.productID)
          )
        );

      if (existingProducts.length) {
        throw new Error(
          `Product IDs already exist: ${existingProducts
            .map((p) => p.productID)
            .join(", ")}`
        );
      }
    }

    // Process in a transaction
    const result = await db.transaction(async (tx) => {
      const createdProducts = [];
      const updatedProducts = [];

      // Create new products
      for (const product of productsToCreate) {
        const inserted = await tx
          .insert(productsTable)
          .values(product)
          .returning();
        createdProducts.push(inserted[0]);
      }

      // Update existing products
      for (const product of productsToUpdate) {
        if (!product.id) continue;

        const updated = await tx
          .update(productsTable)
          .set({
            productID: product.productID,
            name: product.name,
            description: product.description,
            taxRateId: product.taxRateId,
            quantity: product.quantity,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            alertQuantity: product.alertQuantity,
            categoryId: product.categoryId,
            typeId: product.typeId,
            brandId: product.brandId,
            unitId: product.unitId,
            updatedAt: new Date(),
          })
          .where(eq(productsTable.id, product.id))
          .returning();
        updatedProducts.push(updated[0]);
      }

      return { createdProducts, updatedProducts };
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

export const softDeleteMultipleProducts = async (productIds: string[]) => {
  try {
    const deletedProducts = await db.transaction(async (tx) => {
      const results = [];
      for (const id of productIds) {
        const deleted = await tx
          .update(productsTable)
          .set({ isActive: false })
          .where(eq(productsTable.id, id))
          .returning();
        results.push(deleted[0]);
      }
      return results;
    });

    revalidatePath("/inventory");
    return parseStringify(deletedProducts);
  } catch (error) {
    console.error("Error deleting multiple products:", error);
    throw error;
  }
};

export const deleteMultipleProducts = async (productIds: string[]) => {
  try {
    const deletedProducts = await db.transaction(async (tx) => {
      const results = [];
      for (const id of productIds) {
        const deleted = await tx
          .delete(productsTable)
          .where(eq(productsTable.id, id))
          .returning();
        results.push(deleted[0]);
      }
      return results;
    });

    revalidatePath("/inventory");
    return parseStringify(deletedProducts);
  } catch (error) {
    console.error("Error deleting multiple products:", error);
    throw error;
  }
};
