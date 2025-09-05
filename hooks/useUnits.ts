import {
  addUnit,
  deleteUnit,
  editUnit,
  getUnits,
  softDeleteUnit,
} from "@/lib/actions/unit.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UnitFormValues } from "@/lib/validation";
import { Unit } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseUnitsOptions {
  getAllUnits?: boolean;
  initialData?: { documents: Unit[]; total: number };
}

export interface UnitFilters {
  search?: string;
}

export const defaultUnitFilters: UnitFilters = {
  search: "",
};

export const useUnits = ({
  getAllUnits = false,
  initialData,
}: UseUnitsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllUnits) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: UnitFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllUnits, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["units", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getUnits(page, pageSize, getAllUnits || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllUnits ? 60000 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Optimistic navigation function
  const navigate = useCallback(
    (
      updates: Partial<{
        page: number;
        pageSize: number;
        search: string;
        filters: Partial<UnitFilters>;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      if (updates.page !== undefined) {
        if (updates.page === 0) {
          params.delete("page");
        } else {
          params.set("page", String(updates.page));
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 10) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", String(updates.pageSize));
        }
      }

      if (updates.search !== undefined) {
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
        params.delete("page");
      }

      if (updates.filters) {
        Object.keys(defaultUnitFilters).forEach((key) => params.delete(key));

        Object.entries(updates.filters).forEach(([key, value]) => {
          if (value === undefined || value === "" || value === null) {
            params.delete(key);
          } else {
            params.set(key, String(value));
          }
        });
        params.delete("page");
      }

      const newUrl = `?${params.toString()}`;

      // Use startTransition for non-urgent updates
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // Prefetch the new data immediately
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: UnitFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "units",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getUnits(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllUnits) return;
      navigate({ page });
    },
    [getAllUnits, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllUnits) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllUnits, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllUnits) return;
      navigate({ search });
    },
    [getAllUnits, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<UnitFilters>) => {
      if (getAllUnits) return;
      navigate({ filters });
    },
    [getAllUnits, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllUnits) return;
    navigate({
      filters: defaultUnitFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllUnits, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("units_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "units",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["units"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add unit mutation
  const { mutate: addUnitMutation, status: addUnitStatus } = useMutation({
    mutationFn: (data: UnitFormValues) => addUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit added successfully");
    },
    onError: (error) => {
      console.error("Error adding unit:", error);
      toast.error("Failed to add unit");
    },
  });

  // Edit unit mutation
  const { mutate: editUnitMutation, status: editUnitStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitFormValues }) =>
      editUnit(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit updated successfully");
    },
    onError: (error) => {
      console.error("Error updating unit:", error);
      toast.error("Failed to update unit");
    },
  });

  // Soft Delete unit mutation
  const { mutate: softDeleteUnitMutation, status: softDeleteUnitStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteUnit(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["units"] });
        toast.success("Unit deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting unit:", error);
        toast.error("Failed to delete unit");
      },
    });

  // Permanently Delete unit mutation
  const { mutate: deleteUnitMutation, status: deleteUnitStatus } = useMutation({
    mutationFn: (id: string) => deleteUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting unit:", error);
      toast.error("Failed to delete unit");
    },
  });

  return {
    units: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    isLoading: isLoading || isPending,
    refetch: refetch,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    filters: currentState.filters,
    setFilters,
    clearFilters,
    addUnit: addUnitMutation,
    isAddingUnit: addUnitStatus === "pending",
    editUnit: editUnitMutation,
    isEditingUnit: editUnitStatus === "pending",
    softDeleteUnit: softDeleteUnitMutation,
    isSoftDeletingUnit: softDeleteUnitStatus === "pending",
    deleteUnit: deleteUnitMutation,
    isDeletingUnit: deleteUnitStatus === "pending",
  };
};
