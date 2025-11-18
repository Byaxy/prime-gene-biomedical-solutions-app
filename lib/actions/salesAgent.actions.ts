/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import { salesAgentsTable, usersTable } from "@/drizzle/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { SalesAgentFilters, SalesAgentFormValues } from "@/lib/validation";

const buildFilterConditions = (filters: SalesAgentFilters) => {
  const conditions = [];

  conditions.push(eq(salesAgentsTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(salesAgentsTable.name, searchTerm),
        ilike(salesAgentsTable.agentCode, searchTerm),
        ilike(salesAgentsTable.email, searchTerm),
        ilike(salesAgentsTable.phone, searchTerm)
      )
    );
  }

  return conditions;
};

export const createSalesAgent = async (values: SalesAgentFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      const existingAgent = await tx.query.salesAgentsTable.findFirst({
        where: eq(salesAgentsTable.agentCode, values.agentCode),
      });

      if (existingAgent) {
        throw new Error(
          `Sales agent with code '${values.agentCode}' already exists.`
        );
      }

      // If userId is provided, ensure it exists
      if (values.userId) {
        const existingUser = await tx.query.usersTable.findFirst({
          where: and(
            eq(usersTable.id, values.userId),
            eq(usersTable.isActive, true)
          ),
        });

        if (!existingUser) {
          throw new Error("Linked User ID not found or is inactive.");
        }
      }

      const [newAgent] = await tx
        .insert(salesAgentsTable)
        .values({
          name: values.name,
          email: values.email || null,
          phone: values.phone,
          agentCode: values.agentCode,
          userId: values.userId || null,
          notes: values.notes || null,
        })
        .returning();

      return newAgent;
    });

    revalidatePath("/sales-agents");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating sales agent:", error);
    throw new Error(error.message || "Failed to create sales agent.");
  }
};

export const updateSalesAgent = async (
  id: string,
  values: Partial<SalesAgentFormValues>
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Check for unique agentCode if it's being updated
      if (values.agentCode) {
        const existingAgentWithSameCode =
          await tx.query.salesAgentsTable.findFirst({
            where: and(
              eq(salesAgentsTable.agentCode, values.agentCode),
              sql`${salesAgentsTable.id} != ${id}`
            ),
          });

        if (existingAgentWithSameCode) {
          throw new Error(
            `Sales agent with code '${values.agentCode}' already exists.`
          );
        }
      }

      // If userId is provided, ensure it exists
      if (values.userId) {
        const existingUser = await tx.query.usersTable.findFirst({
          where: and(
            eq(usersTable.id, values.userId),
            eq(usersTable.isActive, true)
          ),
        });

        if (!existingUser) {
          throw new Error("Linked User ID not found or is inactive.");
        }
      }

      const [updatedAgent] = await tx
        .update(salesAgentsTable)
        .set({
          name: values.name,
          email:
            values.email === undefined
              ? sql`${salesAgentsTable.email}`
              : values.email || null,
          phone: values.phone,
          agentCode: values.agentCode,
          userId:
            values.userId === undefined
              ? sql`${salesAgentsTable.userId}`
              : values.userId || null,
          notes:
            values.notes === undefined
              ? sql`${salesAgentsTable.notes}`
              : values.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(salesAgentsTable.id, id))
        .returning();

      if (!updatedAgent) {
        throw new Error("Sales agent not found.");
      }

      return updatedAgent;
    });

    revalidatePath("/sales-agents");
    revalidatePath(`/sales-agents/edit/${id}`);
    revalidatePath("/accounting-and-finance/commissions");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating sales agent:", error);
    throw new Error(error.message || "Failed to update sales agent.");
  }
};

export const getSalesAgentById = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const agent = await tx.query.salesAgentsTable.findFirst({
        where: and(
          eq(salesAgentsTable.id, id),
          eq(salesAgentsTable.isActive, true)
        ),
        with: {
          user: true,
        },
      });

      if (!agent) return null;

      const { user, ...agentWithoutUser } = agent;

      return parseStringify({
        salesAgent: agentWithoutUser,
        user: user,
      });
    });

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error fetching sales agent by ID:", error);
    throw new Error(error.message || "Failed to fetch sales agent by ID.");
  }
};

export const getSalesAgents = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: SalesAgentFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          salesAgent: salesAgentsTable,
          user: usersTable,
        })
        .from(salesAgentsTable)
        .leftJoin(usersTable, eq(salesAgentsTable.userId, usersTable.id))
        .$dynamic();

      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(salesAgentsTable.createdAt));

      if (!getAll && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const agents = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(salesAgentsTable)
        .leftJoin(usersTable, eq(salesAgentsTable.userId, usersTable.id))
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAll
        ? agents.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: agents,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error: any) {
    console.error("Error fetching sales agents:", error);
    throw new Error(error.message || "Failed to fetch sales agents.");
  }
};

export const softDeleteSalesAgent = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const [updatedAgent] = await tx
        .update(salesAgentsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(salesAgentsTable.id, id))
        .returning();

      if (!updatedAgent) {
        throw new Error("Sales agent not found.");
      }

      return updatedAgent;
    });

    revalidatePath("/sales-agents");
    revalidatePath("/accounting-and-finance/commissions");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error deactivating sales agent:", error);
    throw new Error(error.message || "Failed to deactivate sales agent.");
  }
};

// Generate Sales Agent code
export const generateSalesAgentCode = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const lastCode = await tx
        .select({ agentCode: salesAgentsTable.agentCode })
        .from(salesAgentsTable)
        .where(sql`agent_code LIKE ${`SA-%`}`)
        .orderBy(desc(salesAgentsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastCode.length > 0) {
        const lastIAgentCode = lastCode[0].agentCode ?? "0";
        const lastSequence = parseInt(
          String(lastIAgentCode).split("-").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(3, "0"); // Pad to 3 digits for SA-001, SA-002, etc.

      return `SA-${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating Agent Code:", error);
    throw error;
  }
};
