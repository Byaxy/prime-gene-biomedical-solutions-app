import { sidebarData, SidebarDataType } from "@/constants";

export interface ParentRoute {
  path: string;
  title: string;
  category: string;
}

export interface RouteMapping {
  parentRoute: string;
  childRoutes: {
    create: string[];
    read: string[];
    update: string[];
    delete: string[];
  };
}

/**
 * Extracts parent routes from the sidebar data
 */
export function extractParentRoutes(data: SidebarDataType[]): ParentRoute[] {
  const parentRoutes: ParentRoute[] = [];
  const seen = new Set<string>();

  function traverse(items: SidebarDataType[], category: string = "") {
    for (const item of items) {
      const isValidPath = item.path && item.path !== "" && item.path !== "/";

      if (isValidPath) {
        // Check if this is a main route (not a sub-action)
        const isSubAction =
          item.path.includes("/add") ||
          item.path.includes("/edit") ||
          item.path.includes("/create") ||
          item.path.includes("/adjust") ||
          item.path.includes("/generate") ||
          item.path.includes("/record") ||
          item.path.includes("/manage") ||
          item.path.includes("/receive") ||
          item.path.includes("/register") ||
          item.path.includes("/duplicate") ||
          item.path.includes("/pay");

        if (!isSubAction && !seen.has(item.path)) {
          seen.add(item.path);
          parentRoutes.push({
            path: item.path,
            title: item.title,
            category: category || item.title,
          });
        }
      }

      // Traverse subcategories
      if (item.subCategories && item.subCategories.length > 0) {
        traverse(item.subCategories, category || item.title);
      }
    }
  }

  traverse(data);

  // Add dashboard separately
  if (!seen.has("/")) {
    parentRoutes.unshift({
      path: "/",
      title: "Dashboard",
      category: "Dashboard",
    });
  }

  return parentRoutes;
}

/**
 * Extract all paths from sidebar
 */
function extractPaths(data: SidebarDataType[]): Set<string> {
  const paths = new Set<string>();
  function traverse(items: SidebarDataType[]) {
    for (const item of items) {
      if (item.path && item.path !== "") {
        paths.add(item.path);
      }
      if (item.subCategories && item.subCategories.length > 0) {
        traverse(item.subCategories);
      }
    }
  }
  traverse(data);
  return paths;
}

/**
 * Build a mapping of parent routes to their child routes grouped by action
 * This automatically maps CRUD operations based on route patterns
 */
export function buildRouteMapping(
  data: SidebarDataType[]
): Map<string, RouteMapping> {
  const mapping = new Map<string, RouteMapping>();
  const allPaths = Array.from(extractPaths(data));

  // Get parent routes (routes without sub-action keywords)
  const parents = allPaths.filter(
    (path) =>
      path !== "" &&
      !path.includes("/add") &&
      !path.includes("/edit") &&
      !path.includes("/create") &&
      !path.includes("/adjust") &&
      !path.includes("/generate") &&
      !path.includes("/record") &&
      !path.includes("/register") &&
      !path.includes("/receive") &&
      !path.includes("/duplicate") &&
      !path.includes("/manage") &&
      !path.includes("/pay")
  );

  parents.forEach((parentPath) => {
    const routeMapping: RouteMapping = {
      parentRoute: parentPath,
      childRoutes: {
        create: [],
        read: [parentPath],
        update: [],
        delete: [],
      },
    };

    // Find all child routes that start with this parent path
    const children = allPaths.filter(
      (path) => path !== parentPath && path.startsWith(parentPath)
    );

    children.forEach((childPath) => {
      // Determine action based on path pattern
      if (
        childPath.includes("/add") ||
        childPath.includes("/create") ||
        childPath.includes("/duplicate") ||
        childPath.includes("/receive") ||
        childPath.includes("/pay") ||
        childPath.includes("/record") ||
        childPath.includes("/manage") ||
        childPath.includes("/register")
      ) {
        routeMapping.childRoutes.create.push(childPath);
      } else if (
        childPath.includes("/edit") ||
        childPath.includes("/update") ||
        childPath.includes("/adjust")
      ) {
        routeMapping.childRoutes.update.push(childPath);
      } else {
        routeMapping.childRoutes.read.push(childPath);
      }
    });

    mapping.set(parentPath, routeMapping);
  });

  return mapping;
}

// Export for use throughout the app
export const allParentRoutes = extractParentRoutes(sidebarData);
export const allAppPaths = extractPaths(sidebarData);
export const routeMapping = buildRouteMapping(sidebarData);

export function findParentRoute(pathname: string): string | null {
  if (routeMapping.has(pathname)) {
    return pathname;
  }

  const sortedParents = Array.from(routeMapping.keys()).sort(
    (a, b) => b.length - a.length
  );

  for (const parentPath of sortedParents) {
    if (pathname.startsWith(parentPath)) {
      return parentPath;
    }
  }

  return null;
}

/**
 * Determine required action for a given pathname
 */
export function determineRequiredAction(
  pathname: string,
  parentRoute: string
): "create" | "read" | "update" | "delete" | null {
  const mapping = routeMapping.get(parentRoute);
  if (!mapping) return null;

  // Check each action's routes
  if (mapping.childRoutes.create.includes(pathname)) return "create";
  if (mapping.childRoutes.update.includes(pathname)) return "update";
  if (mapping.childRoutes.delete.includes(pathname)) return "delete";
  if (mapping.childRoutes.read.includes(pathname)) return "read";

  // Handle dynamic routes (e.g., /users/edit-user/[id])
  if (pathname.match(/\/edit-[^\/]+\/[^\/]+$/)) return "update";
  if (pathname.match(/\/edit\/[^\/]+$/)) return "update";

  // Default to read if it's under this parent
  if (pathname.startsWith(parentRoute)) return "read";

  return null;
}
