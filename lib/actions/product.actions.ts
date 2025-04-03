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
export const bulkAddProducts = async (products: ProductFormValues[]) => {
  try {
    // Validate product IDs are unique in the batch
    const productIDs = products.map((p) => p.productID);
    const duplicateIDs = productIDs.filter(
      (id, index) => productIDs.indexOf(id) !== index
    );

    if (duplicateIDs.length) {
      throw new Error(
        `Duplicate product IDs in upload: ${duplicateIDs.join(", ")}`
      );
    }

    // Check for existing product IDs
    const existingProducts = await db
      .select({ productID: productsTable.productID })
      .from(productsTable)
      .where(inArray(productsTable.productID, productIDs));

    if (existingProducts.length) {
      throw new Error(
        `Product IDs already exist: ${existingProducts
          .map((p) => p.productID)
          .join(", ")}`
      );
    }

    // Insert all products in a transaction
    const insertedProducts = await db.transaction(async (tx) => {
      const results = [];
      for (const product of products) {
        const inserted = await tx
          .insert(productsTable)
          .values(product)
          .returning();
        results.push(inserted[0]);
      }
      return results;
    });

    revalidatePath("/inventory");
    return { success: true, count: insertedProducts.length };
  } catch (error) {
    console.error("Error in bulkAddProducts:", error);
    throw error;
  }
};
