import {
  addVendor,
  deleteVendor,
  editVendor,
  getVendors,
  softDeleteVendor,
} from "@/lib/actions/vendor.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { VendorFormValues } from "@/lib/validation";
import { Vendor } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseVendorsOptions {
  getAllVendors?: boolean;
  initialData?: { documents: Vendor[]; total: number };
}

export interface VendorFilters {
  search?: string;
}

export const defaultVendorFilters: VendorFilters = {
  search: undefined,
};

export const useVendors = ({
  getAllVendors = false,
  initialData,
}: UseVendorsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllVendors) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: VendorFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllVendors, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["vendors", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getVendors(
        page,
        pageSize,
        getAllVendors || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllVendors ? 60000 : 30000,
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
        filters: Partial<VendorFilters>;
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
        Object.keys(defaultVendorFilters).forEach((key) => params.delete(key));

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
      const newFilters: VendorFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "vendors",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getVendors(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllVendors) return;
      navigate({ page });
    },
    [getAllVendors, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllVendors) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllVendors, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllVendors) return;
      navigate({ search });
    },
    [getAllVendors, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<VendorFilters>) => {
      if (getAllVendors) return;
      navigate({ filters });
    },
    [getAllVendors, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllVendors) return;
    navigate({
      filters: defaultVendorFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllVendors, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("vendors_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendors",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vendors"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add vendor mutation
  const { mutate: addVendorMutation, status: addVendorStatus } = useMutation({
    mutationFn: (data: VendorFormValues) => addVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      console.error("Error adding vendor:", error);
    },
  });

  // Edit vendor mutation
  const { mutate: editVendorMutation, status: editVendorStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VendorFormValues }) =>
      editVendor(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      console.error("Error updating vendor:", error);
    },
  });

  // Soft Delete vendor mutation
  const { mutate: softDeleteVendorMutation, status: softDeleteVendorStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteVendor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
      },
      onError: (error) => {
        console.error("Error deleting vendor:", error);
      },
    });

  // Permanently Delete vendor mutation
  const { mutate: deleteVendorMutation, status: deleteVendorStatus } =
    useMutation({
      mutationFn: (id: string) => deleteVendor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
      },
      onError: (error) => {
        console.error("Error deleting vendor:", error);
      },
    });

  return {
    vendors: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    filters: currentState.filters,
    isLoading: isLoading || isPending,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch: refetch,
    addVendor: addVendorMutation,
    isAddingVendor: addVendorStatus === "pending",
    editVendor: editVendorMutation,
    isEditingVendor: editVendorStatus === "pending",
    softDeleteVendor: softDeleteVendorMutation,
    isSoftDeletingVendor: softDeleteVendorStatus === "pending",
    deleteVendor: deleteVendorMutation,
    isDeletingVendor: deleteVendorStatus === "pending",
  };
};
