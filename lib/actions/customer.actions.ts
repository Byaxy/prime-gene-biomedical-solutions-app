"use server";

import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { CustomerFormValues } from "../validation";
import { customersTable } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { CustomerFilters } from "@/hooks/useCustomers";

const buildFilterConditions = (filters: CustomerFilters) => {
  const conditions = [];

  conditions.push(eq(customersTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(customersTable.name, searchTerm),
        ilike(customersTable.email, searchTerm),
        ilike(customersTable.phone, searchTerm)
      )
    );
  }

  return conditions;
};

// Get Customers
export const getCustomers = async (
  page: number = 0,
  limit: number = 10,
  getAllCustomers: boolean = false,
  filters?: CustomerFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main query
      let query = tx.select().from(customersTable).$dynamic();

      const conditions = buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(customersTable.createdAt));

      if (!getAllCustomers && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const customers = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(customersTable)
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllCustomers
        ? customers.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: customers,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
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
