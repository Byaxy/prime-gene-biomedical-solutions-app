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
import { Attachment } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseSalesOptions {
  getAllSales?: boolean;
  initialPageSize?: number;
}

export interface SaleFilters {
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
  initialPageSize = 10,
}: UseSalesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<SaleFilters>(defaultSaleFilters);

  const shouldFetchAll = getAllSales;

  const isShowAllMode = pageSize === 0;

  // Query for all Sales
  const allSalesQuery = useQuery({
    queryKey: ["sales", "allSales", filters],
    queryFn: async () => {
      const result = await getSales(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Sales
  const paginatedSalesQuery = useQuery({
    queryKey: ["sales", "paginatedSales", page, pageSize, filters],
    queryFn: async () => {
      const result = await getSales(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allSalesQuery : paginatedSalesQuery;
  const sales =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedSalesQuery.data &&
      page * pageSize < paginatedSalesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["sales", "paginatedSales", page + 1, pageSize, filters],
        queryFn: () => getSales(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedSalesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: SaleFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

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
    sales,
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
    defaultFilterValues: defaultSaleFilters,
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
