/* eslint-disable @typescript-eslint/no-explicit-any */
import { PermissionAction, Role, RoutePermission, User } from "@/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface AuthState {
  user: User | null;
  role: Role | null;
  permissions: Map<string, RoutePermission>;
  isAdmin: boolean;
  isLoading: boolean;

  // Setters
  setUser: (user: User | null) => void;
  setRole: (role: Role | null) => void;
  setPermissions: (permissions: Map<string, RoutePermission>) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;

  // Permission checking utilities
  hasPermission: (
    route: string,
    action: "create" | "read" | "update" | "delete"
  ) => boolean;
  canAccessRoute: (route: string) => boolean;
  getRoutePermissions: (route: string) => RoutePermission | null;

  // Clear all auth data
  clearAuth: () => void;
}

// Custom storage to handle Map serialization
const customStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;

    const parsed = JSON.parse(str);

    // Don't restore permissions from storage - they should be fetched fresh
    if (parsed.state && parsed.state.permissions) {
      parsed.state.permissions = [];
    }

    return parsed;
  },
  setItem: (name: string, value: any) => {
    const toStore = {
      ...value,
      state: {
        ...value.state,
        permissions: [],
      },
    };
    localStorage.setItem(name, JSON.stringify(toStore));
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      user: null,
      role: null,
      permissions: new Map(),
      isAdmin: false,
      isLoading: true,

      setUser: (user) => set({ user }),

      setRole: (role) => set({ role }),

      setPermissions: (permissions) => set({ permissions }),

      setIsAdmin: (isAdmin) => set({ isAdmin }),

      setIsLoading: (isLoading) => set({ isLoading }),

      /**
       * Check if user has a specific permission for a route
       */
      hasPermission: (route: string, action: PermissionAction) => {
        const { permissions, isAdmin } = get();

        // Admins have all permissions
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

      /**
       * Check if user can access a route (has read permission)
       */
      canAccessRoute: (route: string) => {
        const { permissions, isAdmin } = get();

        // Admins can access all routes
        if (isAdmin) return true;

        const routePerms = permissions.get(route);
        return routePerms?.canRead || false;
      },

      /**
       * Get all permissions for a specific route
       */
      getRoutePermissions: (route: string) => {
        const { permissions, isAdmin } = get();

        // Admins have all permissions
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

      /**
       * Clear all authentication data
       */
      clearAuth: () => {
        set({
          user: null,
          role: null,
          permissions: new Map(),
          isAdmin: false,
          isLoading: false,
        });
      },
    })),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAdmin: state.isAdmin,
      }),
    }
  )
);
