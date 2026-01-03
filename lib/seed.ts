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

  if (!superAdminRole) {
    console.error("Failed to retrieve all roles after seeding. Exiting.");
    process.exit(1);
  }

  // 2. Clear existing permissions for these roles to avoid duplicates and outdated entries
  await db
    .delete(permissionsTable)
    .where(inArray(permissionsTable.roleId, [superAdminRole.id]));

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
