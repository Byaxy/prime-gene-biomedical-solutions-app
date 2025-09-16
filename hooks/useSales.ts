/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addSale,
  deleteSale,
  editSale,
  getSales,
  softDeleteSale,
} from "@/lib/actions/sale.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SaleFormValues } from "@/lib/validation";
import { Attachment, SaleWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseSalesOptions {
  getAllSales?: boolean;
  initialData?: { documents: SaleWithRelations[]; total: number };
}

export interface SaleFilters {
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  amountPaid_min?: number;
  amountPaid_max?: number;
  saleDate_start?: string;
  saleDate_end?: string;
  status?: string;
  paymentStatus?: string;
}

export const defaultSaleFilters: SaleFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  amountPaid_min: undefined,
  amountPaid_max: undefined,
  saleDate_start: undefined,
  saleDate_end: undefined,
  status: undefined,
  paymentStatus: undefined,
};

export const useSales = ({
  getAllSales = false,
  initialData,
}: UseSalesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllSales) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: SaleFilters = {
      search: search || undefined,
      totalAmount_min: searchParams.get("totalAmount_min")
        ? Number(searchParams.get("totalAmount_min"))
        : undefined,
      totalAmount_max: searchParams.get("totalAmount_max")
        ? Number(searchParams.get("totalAmount_max"))
        : undefined,
      amountPaid_min: searchParams.get("amountPaid_min")
        ? Number(searchParams.get("amountPaid_min"))
        : undefined,
      amountPaid_max: searchParams.get("amountPaid_max")
        ? Number(searchParams.get("amountPaid_max"))
        : undefined,
      status: searchParams.get("status") || undefined,
      saleDate_start: searchParams.get("saleDate_start") || undefined,
      saleDate_end: searchParams.get("saleDate_end") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllSales, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["sales", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getSales(page, pageSize, getAllSales || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllSales ? 60000 : 30000,
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
        filters: Partial<SaleFilters>;
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
        Object.keys(defaultSaleFilters).forEach((key) => params.delete(key));

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
      const newFilters: SaleFilters = {
        search: newParams.get("search") || undefined,
        totalAmount_min: newParams.get("totalAmount_min")
          ? Number(newParams.get("totalAmount_min"))
          : undefined,
        totalAmount_max: newParams.get("totalAmount_max")
          ? Number(newParams.get("totalAmount_max"))
          : undefined,
        amountPaid_min: newParams.get("amountPaid_min")
          ? Number(newParams.get("amountPaid_min"))
          : undefined,
        amountPaid_max: newParams.get("amountPaid_max")
          ? Number(newParams.get("amountPaid_max"))
          : undefined,
        status: newParams.get("status") || undefined,
        saleDate_start: newParams.get("saleDate_start") || undefined,
        saleDate_end: newParams.get("saleDate_end") || undefined,
        paymentStatus: newParams.get("paymentStatus") || undefined,
      };

      const newQueryKey = [
        "sales",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getSales(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllSales) return;
      navigate({ page });
    },
    [getAllSales, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllSales) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllSales, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllSales) return;
      navigate({ search });
    },
    [getAllSales, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<SaleFilters>) => {
      if (getAllSales) return;
      navigate({ filters });
    },
    [getAllSales, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllSales) return;
    navigate({
      filters: defaultSaleFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllSales, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("sales_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sales"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: addSaleMutation, status: addSaleStatus } = useMutation({
    mutationFn: async ({ data }: { data: SaleFormValues }) => {
      const supabase = createSupabaseBrowserClient();
      const attachments: Attachment[] = [];

      if (data.attachments && data.attachments.length > 0) {
        try {
          // Upload all files
          await Promise.all(
            data.attachments.map(async (file: any) => {
              const fileId = `${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage
                .from("images")
                .upload(fileId, file);

              if (uploadError) throw uploadError;

              // Get the file URL
              const { data: urlData } = supabase.storage
                .from("images")
                .getPublicUrl(fileId);

              attachments.push({
                id: fileId,
                url: urlData.publicUrl,
                name: file.name,
                size: file.size,
                type: file.type,
              });
            })
          );
        } catch (error) {
          console.error("Error uploading files:", error);
          throw new Error("Failed to upload attachments");
        }
      }

      const dataWithAttachment = {
        ...data,
        attachments,
      };
      return addSale(dataWithAttachment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const { mutate: editSaleMutation, status: editSaleStatus } = useMutation({
    mutationFn: async ({
      id,
      data,
      prevAttachmentIds,
    }: {
      id: string;
      data: SaleFormValues;
      prevAttachmentIds?: string[];
    }) => {
      const supabase = createSupabaseBrowserClient();
      const attachments: Array<{
        id: string;
        url: string;
        name: string;
        size: number;
        type: string;
      }> = [];

      // Delete previous attachments if needed
      if (prevAttachmentIds && prevAttachmentIds.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("images")
          .remove(prevAttachmentIds);

        if (deleteError) {
          console.warn("Failed to delete previous attachments:", deleteError);
        }
      }

      // Upload new attachments
      if (data.attachments && data.attachments.length > 0) {
        try {
          await Promise.all(
            data.attachments.map(async (file: any) => {
              const fileId = `${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage
                .from("images")
                .upload(fileId, file);

              if (uploadError) throw uploadError;

              // Get the file URL
              const { data: urlData } = supabase.storage
                .from("images")
                .getPublicUrl(fileId);

              attachments.push({
                id: fileId,
                url: urlData.publicUrl,
                name: file.name,
                size: file.size,
                type: file.type,
              });
            })
          );
        } catch (error) {
          console.error("Error uploading files:", error);
          throw new Error("Failed to upload attachments");
        }
      }

      const dataWithAttachments = {
        ...data,
        attachments,
      };
      return editSale(dataWithAttachments, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", "paginatedSales"] });
    },
  });

  const { mutate: deleteSaleMutation, status: deleteSaleStatus } = useMutation({
    mutationFn: (id: string) => deleteSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", "paginatedSales"] });
      toast.success("Sale deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting sale:", error);
      toast.error("Failed to delete sale");
    },
  });

  const { mutate: softDeleteSaleMutation, status: softDeleteSaleStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteSale(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["sales", "paginatedSales"],
        });
      },
    });

  return {
    sales: data?.documents || [],
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
    addSale: addSaleMutation,
    isAddingSale: addSaleStatus === "pending",
    editSale: editSaleMutation,
    isEditingSale: editSaleStatus === "pending",
    deleteSale: deleteSaleMutation,
    isDeletingSale: deleteSaleStatus === "pending",
    softDeleteSale: softDeleteSaleMutation,
    isSoftDeletingSale: softDeleteSaleStatus === "pending",
  };
};
