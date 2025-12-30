import { PermissionAction } from "@/types";
import {
  findParentRoute,
  determineRequiredAction,
  routeMapping,
} from "@/lib/routeUtils";

export interface RoutePermissionRequirement {
  route: string;
  action: PermissionAction;
}

/**
 * Automatically determines required permission based on pathname
 * Uses the sidebar structure to intelligently map routes to permissions
 */
export function getRequiredPermission(
  pathname: string
): RoutePermissionRequirement | null {
  // Special case: Dashboard
  if (pathname === "/") {
    return { route: "/", action: "read" };
  }

  // Special case: Settings routes - all require update permission
  if (pathname.startsWith("/settings")) {
    return { route: "/settings", action: "update" };
  }

  // Find the parent route
  const parentRoute = findParentRoute(pathname);
  if (!parentRoute) {
    return null;
  }

  // Determine the required action
  const action = determineRequiredAction(pathname, parentRoute);
  if (!action) {
    return null;
  }

  return {
    route: parentRoute,
    action: action,
  };
}

/**
 * Get all routes that require a specific permission
 * Useful for debugging and testing
 */
export function getRoutesForPermission(
  parentRoute: string,
  action: PermissionAction
): string[] {
  const mapping = routeMapping.get(parentRoute);

  if (!mapping) return [];

  return mapping.childRoutes[action] || [];
}
