/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addPurchase,
  editPurchase,
  getPurchases,
  deletePurchase,
  softDeletePurchase,
} from "@/lib/actions/purchase.actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PurchaseFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import { Attachment, PurchaseWithRelations } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

interface UsePurchasesOptions {
  getAllPurchases?: boolean;
  initialData?: { documents: PurchaseWithRelations[]; total: number };
}

export interface PurchaseFilters {
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseDate_start?: string;
  purchaseDate_end?: string;
  status?: string;
  paymentStatus?: string;
}

export const defaultPurchaseFilters: PurchaseFilters = {
  search: undefined,
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  purchaseDate_start: undefined,
  purchaseDate_end: undefined,
  status: undefined,
  paymentStatus: undefined,
};

export const usePurchases = ({
  getAllPurchases = false,
  initialData,
}: UsePurchasesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllPurchases) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: PurchaseFilters = {
      search: search || undefined,
      totalAmount_min: searchParams.get("totalAmount_min")
        ? Number(searchParams.get("totalAmount_min"))
        : undefined,
      totalAmount_max: searchParams.get("totalAmount_max")
        ? Number(searchParams.get("totalAmount_max"))
        : undefined,
      status: searchParams.get("status") || undefined,
      purchaseDate_start: searchParams.get("purchaseDate_start") || undefined,
      purchaseDate_end: searchParams.get("purchaseDate_end") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllPurchases, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["purchases", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getPurchases(
        page,
        pageSize,
        getAllPurchases || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllPurchases ? 60000 : 30000,
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
        filters: Partial<PurchaseFilters>;
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
        Object.keys(defaultPurchaseFilters).forEach((key) =>
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
      const newFilters: PurchaseFilters = {
        search: newParams.get("search") || undefined,
        totalAmount_min: newParams.get("totalAmount_min")
          ? Number(newParams.get("totalAmount_min"))
          : undefined,
        totalAmount_max: newParams.get("totalAmount_max")
          ? Number(newParams.get("totalAmount_max"))
          : undefined,
        status: newParams.get("status") || undefined,
        purchaseDate_start: newParams.get("purchaseDate_start") || undefined,
        purchaseDate_end: newParams.get("purchaseDate_end") || undefined,
        paymentStatus: newParams.get("paymentStatus") || undefined,
      };

      const newQueryKey = [
        "purchases",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getPurchases(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllPurchases) return;
      navigate({ page });
    },
    [getAllPurchases, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllPurchases) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllPurchases, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllPurchases) return;
      navigate({ search });
    },
    [getAllPurchases, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<PurchaseFilters>) => {
      if (getAllPurchases) return;
      navigate({ filters });
    },
    [getAllPurchases, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllPurchases) return;
    navigate({
      filters: defaultPurchaseFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllPurchases, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("purchases_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: addPurchaseMutation, status: addPurchaseStatus } =
    useMutation({
      mutationFn: async (data: PurchaseFormValues) => {
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
        return addPurchase(dataWithAttachment);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchases"],
        });
      },
      onError: (error) => {
        console.error("Error creating purchase:", error);
      },
    });

  const { mutate: editPurchaseMutation, status: editPurchaseStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        prevAttachmentIds,
      }: {
        id: string;
        data: PurchaseFormValues;
        prevAttachmentIds?: string[];
      }) => {
        const supabase = createSupabaseBrowserClient();
        const attachments: Attachment[] = [];

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
        return editPurchase(dataWithAttachments, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchases"],
        });
      },
      onError: (error) => {
        console.error("Error updating purchase:", error);
      },
    });

  const {
    mutate: softDeletePurchaseMutation,
    status: softDeletePurchaseStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchases"],
      });
    },
    onError: (error) => {
      console.error("Error soft deleting purchase:", error);
    },
  });

  const { mutate: deletePurchaseMutation, status: deletePurchaseStatus } =
    useMutation({
      mutationFn: (id: string) => deletePurchase(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchases"],
        });
      },
      onError: (error) => {
        console.error("Error deleting purchase:", error);
        toast.error("Failed to delete purchase");
      },
    });

  return {
    purchases: data?.documents || [],
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
    addPurchase: addPurchaseMutation,
    isCreatingPurchase: addPurchaseStatus === "pending",
    editPurchase: editPurchaseMutation,
    isEditingPurchase: editPurchaseStatus === "pending",
    softDeletePurchase: softDeletePurchaseMutation,
    isSoftDeletingPurchase: softDeletePurchaseStatus === "pending",
    deletePurchase: deletePurchaseMutation,
    isDeletingPurchase: deletePurchaseStatus === "pending",
  };
};
