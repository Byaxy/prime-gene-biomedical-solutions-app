import { db } from "@/drizzle/db";
import { permissionsTable, rolesTable } from "@/drizzle/schema";
import { allParentRoutes } from "@/lib/routeUtils";
import { inArray } from "drizzle-orm";

async function seed() {
  console.log("Seeding roles and permissions...");

  const [superAdminRole] = await db
    .insert(rolesTable)
    .values({
      name: "Super Admin",
      description: "Full access to all system features.",
      isSystemRole: true,
    })
    .onConflictDoUpdate({
      target: rolesTable.name,
      set: {
        description: "Full access to all system features.",
        isSystemRole: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [adminRole] = await db
    .insert(rolesTable)
    .values({
      name: "Admin",
      description: "Manage most aspects of the system.",
      isSystemRole: true,
    })
    .onConflictDoUpdate({
      target: rolesTable.name,
      set: {
        description: "Manage most aspects of the system.",
        isSystemRole: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [userRole] = await db
    .insert(rolesTable)
    .values({
      name: "User",
      description: "Standard user with limited access.",
    })
    .onConflictDoUpdate({
      target: rolesTable.name,
      set: {
        description: "Standard user with limited access.",
        isSystemRole: false,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [salesManagerRole] = await db
    .insert(rolesTable)
    .values({
      name: "Sales Manager",
      description: "Manages sales, quotations, and sales agents.",
    })
    .onConflictDoUpdate({
      target: rolesTable.name,
      set: {
        description: "Manages sales, quotations, and sales agents.",
        isSystemRole: false,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!superAdminRole || !adminRole || !userRole || !salesManagerRole) {
    console.error("Failed to retrieve all roles after seeding. Exiting.");
    process.exit(1);
  }

  // 2. Clear existing permissions for these roles to avoid duplicates and outdated entries
  await db
    .delete(permissionsTable)
    .where(
      inArray(permissionsTable.roleId, [
        superAdminRole.id,
        adminRole.id,
        userRole.id,
        salesManagerRole.id,
      ])
    );

  const allPermissionsToInsert: Array<typeof permissionsTable.$inferInsert> =
    [];

  const createRolePermissions = (
    roleId: string,
    routes: { route: string; actions: { [key: string]: boolean } }[]
  ) => {
    routes.forEach((routePerm) => {
      const routeInfo = allParentRoutes.find((r) => r.path === routePerm.route);
      if (routeInfo) {
        allPermissionsToInsert.push({
          roleId: roleId,
          route: routeInfo.path,
          routeTitle: routeInfo.title,
          category: routeInfo.category,
          canCreate: routePerm.actions.canCreate || false,
          canRead: routePerm.actions.canRead || false,
          canUpdate: routePerm.actions.canUpdate || false,
          canDelete: routePerm.actions.canDelete || false,
        });
      } else {
        console.warn(`Route ${routePerm.route} not found in allParentRoutes`);
      }
    });
  };

  // --- Super Admin: All routes, all actions ---
  const superAdminPermissions: {
    route: string;
    actions: { [key: string]: boolean };
  }[] = allParentRoutes.map((route) => ({
    route: route.path,
    actions: {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    },
  }));
  createRolePermissions(superAdminRole.id, superAdminPermissions);

  // --- Admin: All routes, all actions (as per request) ---
  const adminPermissions: {
    route: string;
    actions: { [key: string]: boolean };
  }[] = allParentRoutes.map((route) => ({
    route: route.path,
    actions: {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    },
  }));
  createRolePermissions(adminRole.id, adminPermissions);

  // --- User: View Dashboard, View Inventory List ---
  const userPermissions: {
    route: string;
    actions: { [key: string]: boolean };
  }[] = [
    { route: "/", actions: { canRead: true } },
    { route: "/inventory", actions: { canRead: true } },
  ];
  createRolePermissions(userRole.id, userPermissions);

  // --- Sales Manager: Sales, Quotations, Sales Agents, Deliveries, Promissory Notes, Waybills ---
  const salesManagerPermissions: {
    route: string;
    actions: { [key: string]: boolean };
  }[] = [
    // Sales Section
    {
      route: "/sales",
      actions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    },

    // Quotations Section
    {
      route: "/quotations",
      actions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    },

    // Sales Agents Section
    {
      route: "/sales-agents",
      actions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    },

    // Deliveries Section
    {
      route: "/deliveries",
      actions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    },

    // Promissory Notes
    {
      route: "/promissory-notes",
      actions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    },

    // Waybills
    {
      route: "/waybills",
      actions: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    },

    // Allow viewing of Dashboard and Customers as well (common for sales roles)
    { route: "/", actions: { canRead: true } },
    {
      route: "/customers",
      actions: { canRead: true, canCreate: true, canUpdate: true },
    },
  ];
  createRolePermissions(salesManagerRole.id, salesManagerPermissions);

  // Insert all collected permissions in one go
  if (allPermissionsToInsert.length > 0) {
    await db.insert(permissionsTable).values(allPermissionsToInsert);
  }

  console.log("Roles and permissions seeded successfully.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  });
