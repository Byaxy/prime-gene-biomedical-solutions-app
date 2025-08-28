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
import { Attachment } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface UseReceivingPurchaseOptions {
  initialPageSize?: number;
  getAllReceivedPurchases?: boolean;
}

export interface ReceivedPurchaseFilters {
  totalAmount_min?: number;
  totalAmount_max?: number;
  receivingDate_start?: string;
  receivingDate_end?: string;
}

export const defaultFilters: ReceivedPurchaseFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  receivingDate_start: undefined,
  receivingDate_end: undefined,
};

export const useReceivingPurchases = ({
  getAllReceivedPurchases = false,
  initialPageSize = 10,
}: UseReceivingPurchaseOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] =
    useState<ReceivedPurchaseFilters>(defaultFilters);

  const shouldFetchAll = getAllReceivedPurchases;

  const isShowAllMode = pageSize === 0;

  // Query for all Purchases
  const allReceivedPurchasesQuery = useQuery({
    queryKey: ["receivedPurchases", filters],
    queryFn: async () => {
      const result = await getReceivedPurchases(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Purchases
  const paginatedReceivedPurchasesQuery = useQuery({
    queryKey: [
      "receivedPurchases",
      "paginatedReceivedPurchases",
      page,
      pageSize,
      filters,
    ],
    queryFn: async () => {
      const result = await getReceivedPurchases(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allReceivedPurchasesQuery
      : paginatedReceivedPurchasesQuery;
  const receivedPurchases =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedReceivedPurchasesQuery.data &&
      page * pageSize < paginatedReceivedPurchasesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "receivedPurchases",
          "paginatedReceivedPurchases",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getReceivedPurchases(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedReceivedPurchasesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: ReceivedPurchaseFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

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
        queryKey: ["receivedPurchases", "paginatedReceivedPurchases"],
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
        queryKey: ["receivedPurchases", "paginatedReceivedPurchases"],
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
        queryKey: ["receivedPurchases", "paginatedReceivedPurchases"],
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
        queryKey: ["receivedPurchases", "paginatedReceivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error deleting received purchase:", error);
    },
  });

  return {
    receivedPurchases,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
    page,
    setPage,
    pageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultFilters,
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
