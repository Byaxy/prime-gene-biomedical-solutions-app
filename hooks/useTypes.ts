import {
  addType,
  deleteType,
  editType,
  getTypes,
  softDeleteType,
} from "@/lib/actions/type.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TypeFormValues } from "@/lib/validation";
import { ProductType } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseTypesOptions {
  getAllTypes?: boolean;
  initialData?: { documents: ProductType[]; total: number };
}

export interface TypeFilters {
  search?: string;
}

export const defaultTypeFilters: TypeFilters = {
  search: "",
};

export const useTypes = ({
  getAllTypes = false,
  initialData,
}: UseTypesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllTypes) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: TypeFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllTypes, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["types", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getTypes(page, pageSize, getAllTypes || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllTypes ? 60000 : 30000,
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
        filters: Partial<TypeFilters>;
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
        Object.keys(defaultTypeFilters).forEach((key) => params.delete(key));

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
      const newFilters: TypeFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "types",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getTypes(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllTypes) return;
      navigate({ page });
    },
    [getAllTypes, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllTypes) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllTypes, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllTypes) return;
      navigate({ search });
    },
    [getAllTypes, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<TypeFilters>) => {
      if (getAllTypes) return;
      navigate({ filters });
    },
    [getAllTypes, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllTypes) return;
    navigate({
      filters: defaultTypeFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllTypes, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("product_types_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_types",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["types"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add type mutation
  const { mutate: addTypeMutation, status: addTypeStatus } = useMutation({
    mutationFn: (data: TypeFormValues) => addType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type added successfully");
    },
    onError: (error) => {
      console.error("Error adding type:", error);
      toast.error("Failed to add type");
    },
  });

  // Edit type mutation
  const { mutate: editTypeMutation, status: editTypeStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TypeFormValues }) =>
      editType(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type updated successfully");
    },
    onError: (error) => {
      console.error("Error updating type:", error);
      toast.error("Failed to update type");
    },
  });

  // Soft Delete type mutation
  const { mutate: softDeleteTypeMutation, status: softDeleteTypeStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteType(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["types"] });
        toast.success("Type deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting type:", error);
        toast.error("Failed to delete type");
      },
    });

  // Permanently Delete type mutation
  const { mutate: deleteTypeMutation, status: deleteTypeStatus } = useMutation({
    mutationFn: (id: string) => deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting type:", error);
      toast.error("Failed to delete type");
    },
  });

  return {
    types: data?.documents || [],
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
    addType: addTypeMutation,
    isAddingType: addTypeStatus === "pending",
    editType: editTypeMutation,
    isEditingType: editTypeStatus === "pending",
    softDeleteType: softDeleteTypeMutation,
    isSoftDeletingType: softDeleteTypeStatus === "pending",
    deleteType: deleteTypeMutation,
    isDeletingType: deleteTypeStatus === "pending",
  };
};
