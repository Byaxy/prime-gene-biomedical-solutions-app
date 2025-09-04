"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { getProducts } from "@/lib/actions/product.actions";
import { ProductWithRelations } from "@/types";

export interface ProductFilters {
  search?: string;
  isActive?: "true" | "false" | "all";
  categoryId?: string;
  brandId?: string;
  typeId?: string;
  unitId?: string;
  costPrice_min?: number;
  costPrice_max?: number;
  sellingPrice_min?: number;
  sellingPrice_max?: number;
  quantity_min?: number;
  quantity_max?: number;
}

export const defaultProductFilters: ProductFilters = {
  isActive: "true",
};

interface UseOptimizedProductsOptions {
  initialData?: { documents: ProductWithRelations[]; total: number };
}

export const useOptimizedProducts = ({
  initialData,
}: UseOptimizedProductsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: ProductFilters = {
      search: search || undefined,
      isActive:
        (searchParams.get("isActive") as ProductFilters["isActive"]) || "true",
      categoryId: searchParams.get("categoryId") || undefined,
      brandId: searchParams.get("brandId") || undefined,
      typeId: searchParams.get("typeId") || undefined,
      unitId: searchParams.get("unitId") || undefined,
      costPrice_min: searchParams.get("costPrice_min")
        ? Number(searchParams.get("costPrice_min"))
        : undefined,
      costPrice_max: searchParams.get("costPrice_max")
        ? Number(searchParams.get("costPrice_max"))
        : undefined,
      sellingPrice_min: searchParams.get("sellingPrice_min")
        ? Number(searchParams.get("sellingPrice_min"))
        : undefined,
      sellingPrice_max: searchParams.get("sellingPrice_max")
        ? Number(searchParams.get("sellingPrice_max"))
        : undefined,
      quantity_min: searchParams.get("quantity_min")
        ? Number(searchParams.get("quantity_min"))
        : undefined,
      quantity_max: searchParams.get("quantity_max")
        ? Number(searchParams.get("quantity_max"))
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["products", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getProducts(page, pageSize, pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: 30000,
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
        filters: Partial<ProductFilters>;
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
      const newFilters: ProductFilters = {
        search: newParams.get("search") || undefined,
        isActive:
          (newParams.get("isActive") as ProductFilters["isActive"]) || "true",
        categoryId: newParams.get("categoryId") || undefined,
        brandId: newParams.get("brandId") || undefined,
        typeId: newParams.get("typeId") || undefined,
        unitId: newParams.get("unitId") || undefined,
        costPrice_min: newParams.get("costPrice_min")
          ? Number(newParams.get("costPrice_min"))
          : undefined,
        costPrice_max: newParams.get("costPrice_max")
          ? Number(newParams.get("costPrice_max"))
          : undefined,
        sellingPrice_min: newParams.get("sellingPrice_min")
          ? Number(newParams.get("sellingPrice_min"))
          : undefined,
        sellingPrice_max: newParams.get("sellingPrice_max")
          ? Number(newParams.get("sellingPrice_max"))
          : undefined,
        quantity_min: newParams.get("quantity_min")
          ? Number(newParams.get("quantity_min"))
          : undefined,
        quantity_max: newParams.get("quantity_max")
          ? Number(newParams.get("quantity_max"))
          : undefined,
      };

      const newQueryKey = [
        "products",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getProducts(newPage, newPageSize, newPageSize === 0, newFilters),
        staleTime: 30000,
      });
    },
    [router, searchParams, queryClient]
  );

  // Convenient methods
  const setPage = useCallback(
    (page: number) => {
      navigate({ page });
    },
    [navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      navigate({ pageSize, page: 0 });
    },
    [navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      navigate({ search });
    },
    [navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<ProductFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({ filters: defaultProductFilters, search: "" });
  }, [navigate]);

  return {
    // Data
    products: data?.documents || [],
    totalItems: data?.total || 0,

    // State
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    filters: currentState.filters,

    // Loading states
    isLoading: isLoading || isPending,
    isFetching,
    error,

    // Actions
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
};
