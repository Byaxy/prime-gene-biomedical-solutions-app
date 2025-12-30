"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  softDeleteRole,
  RoleFormValues,
} from "@/lib/actions/role.actions";
import { RoleWithPermissions } from "@/types";

interface UseRolesOptions {
  getAllRoles?: boolean;
  initialData?: { documents: RoleWithPermissions[]; total: number };
}

export const useRoles = ({
  initialData,
  getAllRoles,
}: UseRolesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL
  const currentState = useMemo(() => {
    if (getAllRoles) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    return { page, pageSize, search };
  }, [searchParams, getAllRoles]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, search } = currentState;
    return ["roles", page, pageSize, search];
  }, [currentState]);

  // Main query
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize } = currentState;
      return getRoles(page, pageSize, getAllRoles || pageSize === 0);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllRoles ? 60000 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Navigation function
  const navigate = useCallback(
    (updates: Partial<{ page: number; pageSize: number; search: string }>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.page !== undefined) {
        params.set("page", String(updates.page === 0 ? "" : updates.page));
      }
      if (updates.pageSize !== undefined) {
        params.set(
          "pageSize",
          String(updates.pageSize === 10 ? "" : updates.pageSize)
        );
        params.delete("page");
      }
      if (updates.search !== undefined) {
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
        params.delete("page");
      }

      const newUrl = `?${params.toString()}`;

      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });
    },
    [searchParams, router]
  );

  const setPage = useCallback((page: number) => navigate({ page }), [navigate]);
  const setPageSize = useCallback(
    (pageSize: number) => navigate({ pageSize, page: 0 }),
    [navigate]
  );
  const setSearch = useCallback(
    (search: string) => navigate({ search }),
    [navigate]
  );

  // Fetch single role
  const useSingleRole = (roleId: string) => {
    return useQuery({
      queryKey: ["roles", roleId],
      queryFn: () => getRoleById(roleId),
      enabled: !!roleId,
      staleTime: 60000,
    });
  };

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async ({ data }: { data: RoleFormValues }) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      roleId,
      data,
    }: {
      roleId: string;
      data: Partial<RoleFormValues>;
    }) => updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async ({ roleId }: { roleId: string }) =>
      softDeleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  return {
    roles: data?.documents || [],
    totalRoles: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    isLoading: isLoading || isPending,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    refetch,
    useSingleRole,
    createRole: createRoleMutation.mutateAsync,
    isCreatingRole: createRoleMutation.isPending,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    deleteRole: deleteRoleMutation.mutateAsync,
    isDeletingRole: deleteRoleMutation.isPending,
  };
};
