import {
  addStore,
  deleteStore,
  editStore,
  getStores,
  softDeleteStore,
} from "@/lib/actions/store.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StoreFormValues } from "@/lib/validation";
import { Store } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseStoresOptions {
  getAllStores?: boolean;
  initialData?: { documents: Store[]; total: number };
}

export interface StoreFilters {
  search?: string;
}

export const defaultStoreFilters: StoreFilters = {
  search: undefined,
};

export const useStores = ({
  getAllStores = false,
  initialData,
}: UseStoresOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllStores) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: StoreFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllStores, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["stores", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getStores(page, pageSize, getAllStores || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllStores ? 60000 : 30000,
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
        filters: Partial<StoreFilters>;
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
        Object.keys(defaultStoreFilters).forEach((key) => params.delete(key));

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
      const newFilters: StoreFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "stores",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getStores(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllStores) return;
      navigate({ page });
    },
    [getAllStores, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllStores) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllStores, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllStores) return;
      navigate({ search });
    },
    [getAllStores, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<StoreFilters>) => {
      if (getAllStores) return;
      navigate({ filters });
    },
    [getAllStores, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllStores) return;
    navigate({
      filters: defaultStoreFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllStores, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("stores_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stores",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stores"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add Store mutation
  const { mutate: addStoreMutation, status: addStoreStatus } = useMutation({
    mutationFn: (data: StoreFormValues) => addStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Store added successfully");
    },
    onError: (error) => {
      console.error("Error adding store:", error);
      toast.error("Failed to add store");
    },
  });

  // Edit store mutation
  const { mutate: editStoreMutation, status: editStoreStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StoreFormValues }) =>
      editStore(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Store updated successfully");
    },
    onError: (error) => {
      console.error("Error updating store:", error);
      toast.error("Failed to update store");
    },
  });

  // Soft Delete store mutation
  const { mutate: softDeleteStoreMutation, status: softDeleteStoreStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteStore(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["stores"] });
        toast.success("Store deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting store:", error);
        toast.error("Failed to delete store");
      },
    });

  // Permanently Delete store mutation
  const { mutate: deleteStoreMutation, status: deleteStoreStatus } =
    useMutation({
      mutationFn: (id: string) => deleteStore(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["stores"] });
        toast.success("Store deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting store:", error);
        toast.error("Failed to delete store");
      },
    });

  return {
    stores: data?.documents || [],
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
    addStore: addStoreMutation,
    isAddingStore: addStoreStatus === "pending",
    editStore: editStoreMutation,
    isEditingStore: editStoreStatus === "pending",
    softDeleteStore: softDeleteStoreMutation,
    isSoftDeletingStore: softDeleteStoreStatus === "pending",
    deleteStore: deleteStoreMutation,
    isDeletingStore: deleteStoreStatus === "pending",
  };
};
