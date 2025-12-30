"use client";

import { useAuthStore } from "@/store/authStore";
import { PermissionAction } from "@/types";
import { useCallback, useMemo } from "react";

export const usePermissions = () => {
  const { permissions, isAdmin, isLoading } = useAuthStore();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (route: string, action: PermissionAction): boolean => {
      if (isAdmin) return true;

      const routePerms = permissions.get(route);
      if (!routePerms) return false;

      switch (action) {
        case "create":
          return routePerms.canCreate;
        case "read":
          return routePerms.canRead;
        case "update":
          return routePerms.canUpdate;
        case "delete":
          return routePerms.canDelete;
        default:
          return false;
      }
    },
    [permissions, isAdmin]
  );

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (checks: Array<{ route: string; action: PermissionAction }>): boolean => {
      if (isAdmin) return true;
      return checks.some(({ route, action }) => hasPermission(route, action));
    },
    [hasPermission, isAdmin]
  );

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (checks: Array<{ route: string; action: PermissionAction }>): boolean => {
      if (isAdmin) return true;
      return checks.every(({ route, action }) => hasPermission(route, action));
    },
    [hasPermission, isAdmin]
  );

  /**
   * Check if user can access a route (read permission)
   */
  const canAccessRoute = useCallback(
    (route: string): boolean => {
      if (isAdmin) return true;

      return hasPermission(route, "read");
    },
    [hasPermission, isAdmin]
  );

  /**
   * Get all permissions for a route
   */
  const getRoutePermissions = useCallback(
    (route: string) => {
      if (isAdmin) {
        return {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        };
      }
      return permissions.get(route) || null;
    },
    [permissions, isAdmin]
  );

  /**
   * Get all accessible routes (memoized)
   */
  const accessibleRoutes = useMemo(() => {
    if (isAdmin) return null; // Admin can access all

    const routes: string[] = [];
    permissions.forEach((perms, route) => {
      if (perms.canRead) {
        routes.push(route);
      }
    });
    return routes;
  }, [permissions, isAdmin]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    getRoutePermissions,
    accessibleRoutes,
    isAdmin,
    isLoading,
  };
};
