"use server";

import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { CustomerFormValues } from "../validation";
import { customersTable } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { desc, eq } from "drizzle-orm";

// Get Customers
export const getCustomers = async (
  page: number = 0,
  limit: number = 10,
  getAllCustomers: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(customersTable)
      .where(eq(customersTable.isActive, true))
      .orderBy(desc(customersTable.createdAt));

    if (!getAllCustomers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const customers = await query;

    // For getAllCustomers, fetch all Customers in batches (if needed)
    if (getAllCustomers) {
      let allCustomers: typeof customers = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select()
          .from(customersTable)
          .where(eq(customersTable.isActive, true))
          .orderBy(desc(customersTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allCustomers = [...allCustomers, ...batch];

        // If we got fewer Customers than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allCustomers),
        total: allCustomers.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(customers),
      total,
    };
  } catch (error) {
    console.error("Error getting customers:", error);
    throw error;
  }
};

// Get customer by ID
export const getCustomerById = async (customerId: string) => {
  try {
    const response = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    throw error;
  }
};

// Add Customer
export const addCustomer = async (customerData: CustomerFormValues) => {
  try {
    const insertedCustomer = await db
      .insert(customersTable)
      .values({
        ...customerData,
        address: customerData.address
          ? {
              addressName: customerData.address.addressName ?? "",
              address: customerData.address.address ?? "",
              city: customerData.address.city ?? "",
              state: customerData.address.state ?? "",
              country: customerData.address.country ?? "",
            }
          : undefined,
      })
      .returning();

    revalidatePath("/customers");
    return parseStringify(insertedCustomer);
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

// Edit Customer
export const editCustomer = async (
  customerData: CustomerFormValues,
  customerId: string
) => {
  try {
    const updatedCustomer = await db
      .update(customersTable)
      .set({
        ...customerData,
        address: customerData.address
          ? {
              addressName: customerData.address.addressName ?? "",
              address: customerData.address.address ?? "",
              city: customerData.address.city ?? "",
              state: customerData.address.state ?? "",
              country: customerData.address.country ?? "",
            }
          : undefined,
      })
      .where(eq(customersTable.id, customerId))
      .returning();

    revalidatePath("/customers");
    return parseStringify(updatedCustomer);
  } catch (error) {
    console.error("Error editing customer:", error);
    throw error;
  }
};

// Permanently Delete Customer
export const deleteCustomer = async (customerId: string) => {
  try {
    const deletedCustomer = await db
      .delete(customersTable)
      .where(eq(customersTable.id, customerId))
      .returning();

    revalidatePath("/customers");
    return parseStringify(deletedCustomer);
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};

// Soft Delete Customer
export const softDeleteCustomer = async (customerId: string) => {
  try {
    const updatedCustomer = await db
      .update(customersTable)
      .set({ isActive: false })
      .where(eq(customersTable.id, customerId))
      .returning();

    revalidatePath("/customers");
    return parseStringify(updatedCustomer);
  } catch (error) {
    console.error("Error soft deleting customer:", error);
    throw error;
  }
};
