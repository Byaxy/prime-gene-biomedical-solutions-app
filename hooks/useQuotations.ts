/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addQuotation,
  deleteQuotation,
  editQuotation,
  getQuotations,
  softDeleteQuotation,
} from "@/lib/actions/quotation.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { QuotationFormValues } from "@/lib/validation";
import { Attachment, QuotationWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseQuotationsOptions {
  getAllQuotations?: boolean;
  initialData?: { documents: QuotationWithRelations[]; total: number };
}

export interface QuotationFilters {
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  quotationDate_start?: string;
  quotationDate_end?: string;
  status?: string;
  convertedToSale?: boolean;
}

export const defaultQuotationFilters: QuotationFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  quotationDate_start: undefined,
  quotationDate_end: undefined,
  status: undefined,
  convertedToSale: undefined,
};

export const useQuotations = ({
  getAllQuotations = false,
  initialData,
}: UseQuotationsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllQuotations) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: QuotationFilters = {
      search: search || undefined,
      status: searchParams.get("status") || undefined,
      convertedToSale: searchParams.get("convertedToSale")
        ? searchParams.get("convertedToSale") === "true"
        : undefined,
      totalAmount_min: searchParams.get("totalAmount_min")
        ? Number(searchParams.get("totalAmount_min"))
        : undefined,
      totalAmount_max: searchParams.get("totalAmount_max")
        ? Number(searchParams.get("totalAmount_max"))
        : undefined,
      quotationDate_start: searchParams.get("quotationDate_start") || undefined,
      quotationDate_end: searchParams.get("quotationDate_end") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllQuotations, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["quotations", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getQuotations(
        page,
        pageSize,
        getAllQuotations || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllQuotations ? 60000 : 30000,
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
        filters: Partial<QuotationFilters>;
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
        Object.keys(defaultQuotationFilters).forEach((key) =>
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
      const newFilters: QuotationFilters = {
        search: newParams.get("search") || undefined,
        status: newParams.get("status") || undefined,
        convertedToSale: newParams.get("convertedToSale")
          ? newParams.get("convertedToSale") === "true"
          : undefined,
        totalAmount_min: newParams.get("totalAmount_min")
          ? Number(newParams.get("totalAmount_min"))
          : undefined,
        totalAmount_max: newParams.get("totalAmount_max")
          ? Number(newParams.get("totalAmount_max"))
          : undefined,
        quotationDate_start: newParams.get("quotationDate_start") || undefined,
        quotationDate_end: newParams.get("quotationDate_end") || undefined,
      };

      const newQueryKey = [
        "quotations",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getQuotations(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllQuotations) return;
      navigate({ page });
    },
    [getAllQuotations, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllQuotations) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllQuotations, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllQuotations) return;
      navigate({ search });
    },
    [getAllQuotations, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<QuotationFilters>) => {
      if (getAllQuotations) return;
      navigate({ filters });
    },
    [getAllQuotations, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllQuotations) return;
    navigate({
      filters: defaultQuotationFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllQuotations, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("quotations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotations",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["quotations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: addQuotationMutation, status: addQuotationStatus } =
    useMutation({
      mutationFn: async (data: QuotationFormValues) => {
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

        return addQuotation(dataWithAttachment);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["quotations"],
        });
      },
    });

  const { mutate: editQuotationMutation, status: editQuotationStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        prevAttachmentIds,
      }: {
        id: string;
        data: QuotationFormValues;
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

        return editQuotation(dataWithAttachments, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["quotations"],
        });
      },
    });

  const {
    mutate: softDeleteQuotationMutation,
    status: softDeleteQuotationStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["quotations"],
      });
    },
  });

  const { mutate: deleteQuotationMutation, status: deleteQuotationStatus } =
    useMutation({
      mutationFn: (id: string) => deleteQuotation(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["quotations"],
        });
        toast.success("Quotation deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting quotation:", error);
        toast.error("Failed to delete quotation");
      },
    });

  return {
    quotations: data?.documents || [],
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
    addQuotation: addQuotationMutation,
    isAddingQuotation: addQuotationStatus === "pending",
    editQuotation: editQuotationMutation,
    isEditingQuotation: editQuotationStatus === "pending",
    deleteQuotation: deleteQuotationMutation,
    isDeletingQuotation: deleteQuotationStatus === "pending",
    softDeleteQuotation: softDeleteQuotationMutation,
    isSoftDeletingQuotation: softDeleteQuotationStatus === "pending",
  };
};
