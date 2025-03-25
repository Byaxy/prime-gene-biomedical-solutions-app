"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ProductFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { productsTable } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

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

// Get Product by ID
export const getProductById = async (productId: string) => {
  try {
    const response = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting product by ID:", error);
    throw error;
  }
};

// Get Products
export const getProducts = async (
  page: number = 0,
  limit: number = 10,
  getAllProducts: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(productsTable)
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
          .select()
          .from(productsTable)
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
      .select()
      .from(productsTable)
      .where(eq(productsTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(products),
      total,
    };
  } catch (error) {
    console.error("Error getting products:", error);
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
        name: productData.name,
        alertQuantity: productData.alertQuantity,
        quantity: productData.quantity,
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
        name: productData.name,
        alertQuantity: productData.alertQuantity,
        quantity: productData.quantity,
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
