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
import { useEffect, useState } from "react";
import { Attachment } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface UsePurchasesOptions {
  getAllPurchases?: boolean;
  initialPageSize?: number;
}

export interface PurchaseFilters {
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseDate_start?: string;
  purchaseDate_end?: string;
  status?: string;
}

export const defaultPurchaseFilters: PurchaseFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  purchaseDate_start: undefined,
  purchaseDate_end: undefined,
  status: undefined,
};

export const usePurchases = ({
  getAllPurchases = false,
  initialPageSize = 10,
}: UsePurchasesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<PurchaseFilters>(
    defaultPurchaseFilters
  );

  const shouldFetchAll = getAllPurchases;

  const isShowAllMode = pageSize === 0;

  // Query for all Purchases
  const allPurchasesQuery = useQuery({
    queryKey: ["purchases", filters],
    queryFn: async () => {
      const result = await getPurchases(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Purchases
  const paginatedPurchasesQuery = useQuery({
    queryKey: ["purchases", "paginatedPurchases", page, pageSize, filters],
    queryFn: async () => {
      const result = await getPurchases(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allPurchasesQuery
      : paginatedPurchasesQuery;
  const purchases =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedPurchasesQuery.data &&
      page * pageSize < paginatedPurchasesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "purchases",
          "paginatedPurchases",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getPurchases(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedPurchasesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: PurchaseFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

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
          queryKey: ["purchases", "paginatedPurchases"],
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
          queryKey: ["purchases", "paginatedPurchases"],
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
        queryKey: ["purchases", "paginatedPurchases"],
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
          queryKey: ["purchases", "paginatedPurchases"],
        });
      },
      onError: (error) => {
        console.error("Error deleting purchase:", error);
        toast.error("Failed to delete purchase");
      },
    });

  return {
    purchases,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultPurchaseFilters,
    addPurchase: addPurchaseMutation,
    isCreatingPurchase: addPurchaseStatus === "pending",
    editPurchase: editPurchaseMutation,
    isEditingPurchase: editPurchaseStatus === "pending",
    softDeletePurchase: softDeletePurchaseMutation,
    isSoftDeletingPurchase: softDeletePurchaseStatus === "pending",
    deletePurchase: deletePurchaseMutation,
    isDeletingPurchase: deletePurchaseStatus === "pending",
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
  };
};
