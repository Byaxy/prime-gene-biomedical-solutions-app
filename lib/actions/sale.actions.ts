"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_SALES_COLLECTION_ID,
  NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID,
  NEXT_PUBLIC_PRODUCTS_COLLECTION_ID,
} from "../appwrite-server";
import { SaleFormValues } from "../validation";

// Sale item document interface
interface SaleItemDocument extends Models.Document {
  sale: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// add sale
export const addSale = async (sale: SaleFormValues) => {
  try {
    // Create sale
    const saleData = {
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate,
      totalAmount: sale.totalAmount,
      amountPaid: sale.amountPaid,
      customer: sale.customer,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      deliveryStatus: sale.deliveryStatus,
      notes: sale.notes,
    };
    const createSaleResponse = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SALES_COLLECTION_ID!,
      ID.unique(),
      saleData
    );

    // Create sale items
    const createSaleItemsPromises = sale.products.map(async (product) => {
      const saleItemData = {
        sale: createSaleResponse.$id,
        product: product.product,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        totalPrice: product.totalPrice,
      };

      return databases.createDocument(
        DATABASE_ID!,
        NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
        ID.unique(),
        saleItemData
      );
    });

    const response = await Promise.all(createSaleItemsPromises);

    // Adjust product stock if delivery status is delivered
    if (sale.deliveryStatus === "delivered") {
      await Promise.all(
        sale.products.map(async (product) => {
          const productData = await databases.getDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.product
          );

          const updatedStock = productData.quantity - product.quantity;

          // Add validation to prevent negative stock
          if (updatedStock < 0) {
            throw new Error(
              `Insufficient stock for product ${product.product}`
            );
          }

          // TO DO: Alert if stock is less than min stock level

          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.product,
            {
              quantity: updatedStock,
            }
          );
        })
      );
    }

    revalidatePath("/sales");
    return parseStringify(response);
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
};

// edit sale
export const editSale = async (sale: SaleFormValues, saleId: string) => {
  try {
    // Update main sale record
    const saleData = {
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate,
      totalAmount: sale.totalAmount,
      amountPaid: sale.amountPaid,
      customer: sale.customer,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      deliveryStatus: sale.deliveryStatus,
      notes: sale.notes,
    };

    // Get existing sale items first
    const existingItems = await databases.listDocuments<SaleItemDocument>(
      DATABASE_ID!,
      NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
      [Query.equal("sale", saleId)]
    );

    const newProductIds = new Set(
      sale.products.map((product) => product.product)
    );

    // Find items to delete (exist in database but not in new products)
    const itemsToDelete = existingItems.documents.filter(
      (item) => !newProductIds.has(item.product)
    );

    // Delete removed items first
    if (itemsToDelete.length > 0) {
      await Promise.all(
        itemsToDelete.map((item) =>
          databases.deleteDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
            item.$id
          )
        )
      );
    }

    // Create a map of existing items for updates
    const existingItemsMap = new Map(
      existingItems.documents.map((item) => [item.product, item])
    );

    // Handle updates and additions after deletions are complete
    await Promise.all(
      sale.products.map(async (product) => {
        const existingItem = existingItemsMap.get(product.product);
        const saleItemData = {
          sale: saleId,
          product: product.product,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
        };

        if (existingItem) {
          // Update existing item
          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
            existingItem.$id,
            saleItemData
          );
        } else {
          // Create new item
          return databases.createDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
            ID.unique(),
            saleItemData
          );
        }
      })
    );

    // Adjust product stock if delivery status is delivered
    const existingSale = await databases.getDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SALES_COLLECTION_ID!,
      saleId
    );

    if (
      sale.deliveryStatus === "delivered" &&
      existingSale.deliveryStatus !== "delivered"
    ) {
      await Promise.all(
        sale.products.map(async (product) => {
          const productData = await databases.getDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.product
          );

          const updatedStock = productData.quantity - product.quantity;

          // Add validation to prevent negative stock
          if (updatedStock < 0) {
            throw new Error(
              `Insufficient stock for product ${product.product}`
            );
          }

          // TO DO: Alert if stock is less than min stock level

          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.product,
            {
              quantity: updatedStock,
            }
          );
        })
      );
    }

    // Update the main sale record after all item operations are complete
    const updateSaleResponse = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SALES_COLLECTION_ID!,
      saleId,
      saleData
    );

    revalidatePath("/sales");
    revalidatePath(`/sales/edit-invoice/${saleId}`);
    return parseStringify(updateSaleResponse);
  } catch (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
};

// get sale by id
export const getSaleById = async (saleId: string) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SALES_COLLECTION_ID!,
      saleId
    );

    // Get sale items for the sale
    const items = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
      [Query.equal("sale", saleId)]
    );

    response.products = items.documents;

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting sale:", error);
    throw error;
  }
};

// get all sales
export const getSales = async (
  page: number = 0,
  limit: number = 10,
  getAllSales: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllSales) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_SALES_COLLECTION_ID!,
        queries
      );

      // Get sale items for each sale
      const salesWithItems = await Promise.all(
        response.documents.map(async (sale) => {
          const items = await databases.listDocuments(
            DATABASE_ID!,
            NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
            [Query.equal("sale", sale.$id)]
          );

          return {
            ...sale,
            products: items.documents,
          };
        })
      );

      return {
        documents: parseStringify(salesWithItems),
        total: response.total,
      };
    } else {
      let allDocuments: Models.Document[] = [];
      let offset = 0;
      const batchSize = 100; // Maximum limit per request(appwrite's max)

      while (true) {
        const batchQueries = [
          Query.equal("isActive", true),
          Query.orderDesc("$createdAt"),
          Query.limit(batchSize),
          Query.offset(offset),
        ];

        const response = await databases.listDocuments(
          DATABASE_ID!,
          NEXT_PUBLIC_SALES_COLLECTION_ID!,
          batchQueries
        );

        // Get sale items for each sale
        const salesWithItems = await Promise.all(
          response.documents.map(async (sale) => {
            const items = await databases.listDocuments(
              DATABASE_ID!,
              NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
              [Query.equal("sale", sale.$id)]
            );

            return {
              ...sale,
              products: items.documents,
            };
          })
        );

        allDocuments = [...allDocuments, ...salesWithItems];

        // If we got fewer documents than the batch size, we've reached the end
        if (salesWithItems.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allDocuments),
        total: allDocuments.length,
      };
    }
  } catch (error) {
    console.error("Error getting sales:", error);
    throw error;
  }
};

// permanently delete sale
export const deleteSale = async (saleId: string) => {
  try {
    // Get existing sale items first
    const existingItems = await databases.listDocuments<SaleItemDocument>(
      DATABASE_ID!,
      NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
      [Query.equal("sale", saleId)]
    );

    // Delete sale items first
    await Promise.all(
      existingItems.documents.map((item) =>
        databases.deleteDocument(
          DATABASE_ID!,
          NEXT_PUBLIC_SALE_ITEMS_COLLECTION_ID!,
          item.$id
        )
      )
    );

    // Delete the main sale record
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SALES_COLLECTION_ID!,
      saleId
    );

    revalidatePath("/sales");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }
};
