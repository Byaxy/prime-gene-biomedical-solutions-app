import {
  addTax,
  deleteTax,
  editTax,
  getTaxes,
  softDeleteTax,
} from "@/lib/actions/tax.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TaxFormValues } from "@/lib/validation";
import { Tax } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseTaxesOptions {
  getAllTaxes?: boolean;
  initialData?: { documents: Tax[]; total: number };
}

export interface TaxFilters {
  search?: string;
}

export const defaultTaxFilters: TaxFilters = {
  search: undefined,
};

export const useTaxes = ({
  getAllTaxes = false,
  initialData,
}: UseTaxesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllTaxes) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: TaxFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllTaxes, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["taxes", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getTaxes(page, pageSize, getAllTaxes || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllTaxes ? 60000 : 30000,
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
        filters: Partial<TaxFilters>;
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
        Object.keys(defaultTaxFilters).forEach((key) => params.delete(key));

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
      const newFilters: TaxFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "taxes",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getTaxes(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllTaxes) return;
      navigate({ page });
    },
    [getAllTaxes, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllTaxes) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllTaxes, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllTaxes) return;
      navigate({ search });
    },
    [getAllTaxes, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<TaxFilters>) => {
      if (getAllTaxes) return;
      navigate({ filters });
    },
    [getAllTaxes, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllTaxes) return;
    navigate({
      filters: defaultTaxFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllTaxes, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("taxes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "taxes",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["taxes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add Tax mutation
  const { mutate: addTaxMutation, status: addTaxStatus } = useMutation({
    mutationFn: (data: TaxFormValues) => addTax(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax added successfully");
    },
    onError: (error) => {
      console.error("Error adding tax:", error);
      toast.error("Failed to add tax");
    },
  });

  // Edit tax mutation
  const { mutate: editTaxMutation, status: editTaxStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaxFormValues }) =>
      editTax(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax updated successfully");
    },
    onError: (error) => {
      console.error("Error updating Tax:", error);
      toast.error("Failed to update Tax");
    },
  });

  // Soft Delete Tax mutation
  const { mutate: softDeleteTaxMutation, status: softDeleteTaxStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteTax(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["taxes"] });
        toast.success("Tax deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting Tax:", error);
        toast.error("Failed to delete Tax");
      },
    });

  // Permanently Delete Tax mutation
  const { mutate: deleteTaxMutation, status: deleteTaxStatus } = useMutation({
    mutationFn: (id: string) => deleteTax(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting tax:", error);
      toast.error("Failed to delete tax");
    },
  });

  return {
    taxes: data?.documents || [],
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
    addTax: addTaxMutation,
    isAddingTax: addTaxStatus === "pending",
    editTax: editTaxMutation,
    isEditingTax: editTaxStatus === "pending",
    softDeleteTax: softDeleteTaxMutation,
    isSoftDeletingTax: softDeleteTaxStatus === "pending",
    deleteTax: deleteTaxMutation,
    isDeletingTax: deleteTaxStatus === "pending",
  };
};
