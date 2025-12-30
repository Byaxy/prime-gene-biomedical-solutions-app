"use server";

import { db } from "@/drizzle/db";
import { permissionsTable, rolesTable, usersTable } from "@/drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { allParentRoutes } from "../routeUtils";
import { parseStringify } from "../utils";

export interface RoleFormValues {
  name: string;
  description: string;
  permissions: {
    [route: string]: {
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    };
  };
}

export interface RoleWithPermissions {
  role: typeof rolesTable.$inferSelect;
  permissions: Array<typeof permissionsTable.$inferSelect>;
}

/**
 * Get all roles with their permissions
 */
export async function getRoles(
  page: number = 0,
  pageSize: number = 10,
  getAll: boolean = false
) {
  try {
    const offset = page * pageSize;

    const rolesQuery = db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.isActive, true))
      .orderBy(desc(rolesTable.createdAt));

    const roles = getAll
      ? await rolesQuery
      : await rolesQuery.limit(pageSize).offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rolesTable)
      .where(eq(rolesTable.isActive, true));

    // Fetch permissions for each role
    const rolesWithPermissions: RoleWithPermissions[] = await Promise.all(
      roles.map(async (role) => {
        const permissions = await db
          .select()
          .from(permissionsTable)
          .where(eq(permissionsTable.roleId, role.id));

        return {
          role,
          permissions,
        };
      })
    );

    return {
      documents: parseStringify(rolesWithPermissions),
      total: count,
    };
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw new Error("Failed to fetch roles");
  }
}

/**
 * Get single role by ID
 */
export async function getRoleById(
  roleId: string
): Promise<RoleWithPermissions | null> {
  try {
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(and(eq(rolesTable.id, roleId), eq(rolesTable.isActive, true)))
      .limit(1);

    if (!role) return null;

    const permissions = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.roleId, role.id));

    return {
      role,
      permissions,
    };
  } catch (error) {
    console.error("Error fetching role:", error);
    throw new Error("Failed to fetch role");
  }
}

/**
 * Create a new role with permissions
 */
export async function createRole(data: RoleFormValues) {
  try {
    // Create role
    const [newRole] = await db
      .insert(rolesTable)
      .values({
        name: data.name,
        description: data.description,
        isSystemRole: false,
        isActive: true,
      })
      .returning();

    // Create permissions for each route
    const permissionInserts = Object.entries(data.permissions).map(
      ([route, perms]) => {
        const routeInfo = allParentRoutes.find((r) => r.path === route);
        return {
          roleId: newRole.id,
          route: route,
          routeTitle: routeInfo?.title || route,
          category: routeInfo?.category || "Other",
          canCreate: perms.canCreate,
          canRead: perms.canRead,
          canUpdate: perms.canUpdate,
          canDelete: perms.canDelete,
        };
      }
    );

    if (permissionInserts.length > 0) {
      await db.insert(permissionsTable).values(permissionInserts);
    }

    // Log audit trail (if you have audit logging)
    // await logAudit(userId, "create", "roles", newRole.id);

    revalidatePath("/settings/roles");
    return { success: true, roleId: newRole.id };
  } catch (error) {
    console.error("Error creating role:", error);
    throw new Error("Failed to create role");
  }
}

/**
 * Update existing role and permissions
 */
export async function updateRole(
  roleId: string,
  data: Partial<RoleFormValues>
) {
  try {
    // Check if it's a system role
    const [existingRole] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, roleId))
      .limit(1);

    if (!existingRole) {
      throw new Error("Role not found");
    }

    if (existingRole.isSystemRole) {
      throw new Error("Cannot modify system roles");
    }

    // Update role details
    if (data.name || data.description) {
      await db
        .update(rolesTable)
        .set({
          name: data.name,
          description: data.description,
          updatedAt: new Date(),
        })
        .where(eq(rolesTable.id, roleId));
    }

    // Update permissions if provided
    if (data.permissions) {
      // Delete existing permissions
      await db
        .delete(permissionsTable)
        .where(eq(permissionsTable.roleId, roleId));

      // Insert new permissions
      const permissionInserts = Object.entries(data.permissions).map(
        ([route, perms]) => {
          const routeInfo = allParentRoutes.find((r) => r.path === route);
          return {
            roleId: roleId,
            route: route,
            routeTitle: routeInfo?.title || route,
            category: routeInfo?.category || "Other",
            canCreate: perms.canCreate,
            canRead: perms.canRead,
            canUpdate: perms.canUpdate,
            canDelete: perms.canDelete,
          };
        }
      );

      if (permissionInserts.length > 0) {
        await db.insert(permissionsTable).values(permissionInserts);
      }
    }

    revalidatePath("/settings/roles");
    return { success: true };
  } catch (error) {
    console.error("Error updating role:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update role"
    );
  }
}

/**
 * Soft delete a role
 */
export async function softDeleteRole(roleId: string) {
  try {
    // Check if it's a system role
    const [existingRole] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, roleId))
      .limit(1);

    if (!existingRole) {
      throw new Error("Role not found");
    }

    if (existingRole.isSystemRole) {
      throw new Error("Cannot delete system roles");
    }

    // Check if any users are assigned to this role
    const usersWithRole = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.roleId, roleId))
      .limit(1);

    if (usersWithRole.length > 0) {
      throw new Error(
        "Cannot delete role that is assigned to users. Please reassign users first."
      );
    }

    await db
      .update(rolesTable)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(rolesTable.id, roleId));

    revalidatePath("/settings/roles");
    return { success: true };
  } catch (error) {
    console.error("Error deleting role:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete role"
    );
  }
}
