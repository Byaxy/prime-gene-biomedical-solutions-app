"use client";

import { useCallback, useEffect, useMemo, useTransition } from "react";
import {
  addCustomer,
  deleteCustomer,
  editCustomer,
  getCustomers,
  softDeleteCustomer,
} from "@/lib/actions/customer.actions";
import { CustomerFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Customer } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface UseCustomersOptions {
  getAllCustomers?: boolean;
  initialData?: { documents: Customer[]; total: number };
}

export interface CustomerFilters {
  search?: string;
}

export const defaultCustomerFilters: CustomerFilters = {
  search: "",
};

export const useCustomers = ({
  getAllCustomers = false,
  initialData,
}: UseCustomersOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllCustomers) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: CustomerFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllCustomers, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["customers", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getCustomers(
        page,
        pageSize,
        getAllCustomers || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllCustomers ? 60000 : 30000,
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
        filters: Partial<CustomerFilters>;
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
        Object.keys(defaultCustomerFilters).forEach((key) =>
          params.delete(key)
        );

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
      const newFilters: CustomerFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "customers",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getCustomers(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllCustomers) return;
      navigate({ page });
    },
    [getAllCustomers, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllCustomers) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllCustomers, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllCustomers) return;
      navigate({ search });
    },
    [getAllCustomers, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<CustomerFilters>) => {
      if (getAllCustomers) return;
      navigate({ filters });
    },
    [getAllCustomers, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllCustomers) return;
    navigate({
      filters: defaultCustomerFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllCustomers, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("customers_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add customer mutation
  const { mutate: addCustomerMutation, status: addCustomerStatus } =
    useMutation({
      mutationFn: (data: CustomerFormValues) => addCustomer(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      },
    });

  // Edit customer mutation
  const { mutate: editCustomerMutation, status: editCustomerStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: CustomerFormValues }) =>
        editCustomer(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      },
    });

  // Soft Delete customer mutation
  const {
    mutate: softDeleteCustomerMutation,
    status: softDeleteCustomerStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    },
  });

  // Permanently Delete customer mutation
  const { mutate: deleteCustomerMutation, status: deleteCustomerStatus } =
    useMutation({
      mutationFn: (id: string) => deleteCustomer(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Customer deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting customer:", error);
        toast.error("Failed to delete customer");
      },
    });

  return {
    customers: data?.documents || [],
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
    addCustomer: addCustomerMutation,
    isAddingCustomer: addCustomerStatus === "pending",
    editCustomer: editCustomerMutation,
    isEditingCustomer: editCustomerStatus === "pending",
    softDeleteCustomer: softDeleteCustomerMutation,
    isSoftDeletingCustomer: softDeleteCustomerStatus === "pending",
    deleteCustomer: deleteCustomerMutation,
    isDeletingCustomer: deleteCustomerStatus === "pending",
  };
};
