import { db } from "@/drizzle/db";
import {
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
} from "@/drizzle/schema";

async function seed() {
  console.log("Seeding roles and permissions...");

  // 1. Create Roles
  const [superAdminRole] = await db
    .insert(rolesTable)
    .values({
      name: "Super Admin",
      description: "Full access to all system features.",
      isSystemRole: true,
    })
    .onConflictDoNothing({ target: rolesTable.name })
    .returning();

  const [adminRole] = await db
    .insert(rolesTable)
    .values({
      name: "Admin",
      description: "Manage most aspects of the system.",
      isSystemRole: true,
    })
    .onConflictDoNothing({ target: rolesTable.name })
    .returning();

  const [userRole] = await db
    .insert(rolesTable)
    .values({
      name: "User",
      description: "Standard user with limited access.",
    })
    .onConflictDoNothing({ target: rolesTable.name })
    .returning();

  const [salesManagerRole] = await db
    .insert(rolesTable)
    .values({
      name: "Sales Manager",
      description: "Manages sales, quotations, and sales agents.",
    })
    .onConflictDoNothing({ target: rolesTable.name })
    .returning();

  // 2. Create Permissions
  // Example for a specific permission
  const [viewDashboardPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "view_dashboard",
      resource: "dashboard",
      action: "view",
      category: "Dashboard",
      routePath: "/",
      isSystemPermission: true,
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  // Example for a wildcard permission
  const [manageAllPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "manage_*",
      resource: "all",
      action: "manage",
      category: "System",
      description: "Grants full control over all resources.",
      isSystemPermission: true,
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [viewInventoryListPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "view_inventory_item_list",
      resource: "inventory_item",
      action: "view",
      category: "Product Management",
      routePath: "/inventory",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [addInventoryItemPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "create_inventory_item",
      resource: "inventory_item",
      action: "create",
      category: "Product Management",
      routePath: "/inventory/add-inventory",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  // Example for a resource wildcard
  const [manageInventoryWildcardPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "manage_inventory_*",
      resource: "inventory_item",
      action: "manage",
      category: "Product Management",
      description: "Grants full control over all inventory-related resources.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [manageSalesWildcardPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "manage_sales_*",
      resource: "sale",
      action: "manage",
      category: "Sales Management",
      description: "Grants full control over all sales-related resources.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [viewSalesPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "view_sales_list",
      resource: "sale",
      action: "view",
      category: "Sales Management",
      routePath: "/sales",
      description: "Allows viewing the list of sales.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [addSalesPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "create_sales",
      resource: "sale",
      action: "create",
      category: "Sales Management",
      routePath: "/sales/add-sales",
      description: "Allows creating new sales.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [viewRolesPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "view_role_list",
      resource: "role",
      action: "view",
      category: "Settings",
      routePath: "/settings/roles",
      description: "Allows viewing the list of roles.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [createRolePerm] = await db
    .insert(permissionsTable)
    .values({
      name: "create_role",
      resource: "role",
      action: "create",
      category: "Settings",
      routePath: "/settings/roles/create",
      description: "Allows creating new roles.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [updateRolePerm] = await db
    .insert(permissionsTable)
    .values({
      name: "update_role",
      resource: "role",
      action: "update",
      category: "Settings",
      description: "Allows editing existing roles.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [deleteRolePerm] = await db
    .insert(permissionsTable)
    .values({
      name: "delete_role",
      resource: "role",
      action: "delete",
      category: "Settings",
      description: "Allows deleting roles.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [assignRolePermissionsPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "assign_role_permissions",
      resource: "role_permission",
      action: "update",
      category: "Settings",
      description: "Allows assigning/revoking permissions for a role.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  const [viewPermissionsPerm] = await db
    .insert(permissionsTable)
    .values({
      name: "view_permission_list",
      resource: "permission",
      action: "view",
      category: "Settings",
      routePath: "/settings/permissions",
      description: "Allows viewing the list of all available permissions.",
    })
    .onConflictDoNothing({ target: permissionsTable.name })
    .returning();

  // 3. Assign Permissions to Roles
  if (superAdminRole) {
    await db
      .insert(rolePermissionsTable)
      .values([
        {
          roleId: superAdminRole.id,
          permissionId: manageAllPerm.id,
        },
        { roleId: superAdminRole.id, permissionId: viewRolesPerm.id },
        { roleId: superAdminRole.id, permissionId: createRolePerm.id },
        { roleId: superAdminRole.id, permissionId: updateRolePerm.id },
        { roleId: superAdminRole.id, permissionId: deleteRolePerm.id },
        {
          roleId: superAdminRole.id,
          permissionId: assignRolePermissionsPerm.id,
        },
        { roleId: superAdminRole.id, permissionId: viewPermissionsPerm.id },
      ])
      .onConflictDoNothing({
        target: [
          rolePermissionsTable.roleId,
          rolePermissionsTable.permissionId,
        ],
      });
  }

  if (adminRole) {
    // Admin gets most specific permissions, maybe a few resource wildcards, but not "manage_*"
    // Example: Admin gets view dashboard, view/add inventory, view/create sales, etc.
    if (viewDashboardPerm)
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: adminRole.id, permissionId: viewDashboardPerm.id })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    if (viewInventoryListPerm)
      await db
        .insert(rolePermissionsTable)
        .values({
          roleId: adminRole.id,
          permissionId: viewInventoryListPerm.id,
        })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    if (addInventoryItemPerm)
      await db
        .insert(rolePermissionsTable)
        .values({
          roleId: adminRole.id,
          permissionId: addInventoryItemPerm.id,
        })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    // If you want Admins to have 'manage_inventory_*'
    if (manageInventoryWildcardPerm)
      await db
        .insert(rolePermissionsTable)
        .values({
          roleId: adminRole.id,
          permissionId: manageInventoryWildcardPerm.id,
        })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
  }

  if (userRole) {
    // User gets only view dashboard
    if (viewDashboardPerm) {
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: userRole.id, permissionId: viewDashboardPerm.id })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    }

    if (viewInventoryListPerm) {
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: userRole.id, permissionId: viewInventoryListPerm.id })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    }
  }

  if (salesManagerRole) {
    // Sales Manager gets manage_sales_*
    if (manageSalesWildcardPerm) {
      await db
        .insert(rolePermissionsTable)
        .values({
          roleId: salesManagerRole.id,
          permissionId: manageSalesWildcardPerm.id,
        })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    }

    if (viewSalesPerm) {
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: salesManagerRole.id, permissionId: viewSalesPerm.id })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    }

    if (addSalesPerm) {
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: salesManagerRole.id, permissionId: addSalesPerm.id })
        .onConflictDoNothing({
          target: [
            rolePermissionsTable.roleId,
            rolePermissionsTable.permissionId,
          ],
        });
    }
  }

  console.log("Roles and permissions seeded successfully.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  });
