/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addReceivedPurchase,
  deleteReceivedPurchase,
  editReceivedPurchase,
  getReceivedPurchases,
  softDeleteReceivedPurchase,
} from "@/lib/actions/receivingPurchases.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ReceivingPurchaseFormValues } from "@/lib/validation";
import { Attachment, ReceivedPurchaseWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseReceivingPurchaseOptions {
  getAllReceivedPurchases?: boolean;
  initialData?: { documents: ReceivedPurchaseWithRelations[]; total: number };
}

export interface ReceivedPurchaseFilters {
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  receivingDate_start?: string;
  receivingDate_end?: string;
}

export const defaultReceivedPurchaseFilters: ReceivedPurchaseFilters = {
  search: undefined,
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  receivingDate_start: undefined,
  receivingDate_end: undefined,
};

export const useReceivingPurchases = ({
  getAllReceivedPurchases = false,
  initialData,
}: UseReceivingPurchaseOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllReceivedPurchases) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: ReceivedPurchaseFilters = {
      search: search || undefined,
      totalAmount_min: searchParams.get("totalAmount_min")
        ? Number(searchParams.get("totalAmount_min"))
        : undefined,
      totalAmount_max: searchParams.get("totalAmount_max")
        ? Number(searchParams.get("totalAmount_max"))
        : undefined,
      receivingDate_start: searchParams.get("receivingDate_start") || undefined,
      receivingDate_end: searchParams.get("receivingDate_end") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllReceivedPurchases, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["receivedPurchases", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getReceivedPurchases(
        page,
        pageSize,
        getAllReceivedPurchases || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllReceivedPurchases ? 60000 : 30000,
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
        filters: Partial<ReceivedPurchaseFilters>;
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
        Object.keys(defaultReceivedPurchaseFilters).forEach((key) =>
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
      const newFilters: ReceivedPurchaseFilters = {
        search: newParams.get("search") || undefined,
        totalAmount_min: newParams.get("totalAmount_min")
          ? Number(newParams.get("totalAmount_min"))
          : undefined,
        totalAmount_max: newParams.get("totalAmount_max")
          ? Number(newParams.get("totalAmount_max"))
          : undefined,
        receivingDate_start: newParams.get("receivingDate_start") || undefined,
        receivingDate_end: newParams.get("receivingDate_end") || undefined,
      };

      const newQueryKey = [
        "receivedPurchases",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getReceivedPurchases(
            newPage,
            newPageSize,
            newPageSize === 0,
            newFilters
          ),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllReceivedPurchases) return;
      navigate({ page });
    },
    [getAllReceivedPurchases, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllReceivedPurchases) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllReceivedPurchases, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllReceivedPurchases) return;
      navigate({ search });
    },
    [getAllReceivedPurchases, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<ReceivedPurchaseFilters>) => {
      if (getAllReceivedPurchases) return;
      navigate({ filters });
    },
    [getAllReceivedPurchases, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllReceivedPurchases) return;
    navigate({
      filters: defaultReceivedPurchaseFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllReceivedPurchases, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("receiving_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receiving",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["receivedPurchases"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const {
    mutate: addReceivedPurchaseMutation,
    status: addReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ReceivingPurchaseFormValues;
      userId: string;
    }) => {
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
      return addReceivedPurchase(dataWithAttachment, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error creating received purchase:", error);
    },
  });

  const {
    mutate: editReceivedPurchaseMutation,
    status: editReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
      userId,
      prevAttachmentIds,
    }: {
      id: string;
      data: ReceivingPurchaseFormValues;
      userId: string;
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
      return editReceivedPurchase(dataWithAttachments, id, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error updating received purchase:", error);
    },
  });

  const {
    mutate: softDeleteReceivedPurchaseMutation,
    status: softDeleteReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      softDeleteReceivedPurchase(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error soft deleting Receivedpurchase:", error);
    },
  });

  const {
    mutate: deleteReceivedPurchaseMutation,
    status: deleteReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      deleteReceivedPurchase(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error deleting received purchase:", error);
    },
  });

  return {
    receivedPurchases: data?.documents || [],
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
    addReceivedPurchase: addReceivedPurchaseMutation,
    isCreatingReceivedPurchase: addReceivedPurchaseStatus === "pending",
    editReceivedPurchase: editReceivedPurchaseMutation,
    isEditingReceivedPurchase: editReceivedPurchaseStatus === "pending",
    softDeleteReceivedPurchase: softDeleteReceivedPurchaseMutation,
    isSoftDeletingReceivedPurchase:
      softDeleteReceivedPurchaseStatus === "pending",
    deleteReceivedPurchase: deleteReceivedPurchaseMutation,
    isDeletingReceivedPurchase: deleteReceivedPurchaseStatus === "pending",
  };
};
