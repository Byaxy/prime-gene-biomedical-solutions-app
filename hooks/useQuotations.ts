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
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseQuotationsOptions {
  getAllQuotations?: boolean;
  initialPageSize?: number;
}

export const useQuotations = ({
  getAllQuotations = false,
  initialPageSize = 10,
}: UseQuotationsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Quotations
  const allQuotationsQuery = useQuery({
    queryKey: ["quotations", "allQuotations"],
    queryFn: async () => {
      const result = await getQuotations(0, 0, true);
      return result.documents;
    },
    enabled: getAllQuotations,
  });

  // Query for paginated Quotations
  const paginatedQuotationsQuery = useQuery({
    queryKey: ["quotations", "paginatedQuotations", page, pageSize],
    queryFn: async () => {
      const result = await getQuotations(page, pageSize, false);
      return result;
    },
    enabled: !getAllQuotations,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllQuotations &&
      paginatedQuotationsQuery.data &&
      page * pageSize < paginatedQuotationsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["quotations", "paginatedQuotations", page + 1, pageSize],
        queryFn: () => getQuotations(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedQuotationsQuery.data,
    queryClient,
    getAllQuotations,
  ]);

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
          queryKey: ["quotations", "paginatedQuotations"],
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
          queryKey: ["quotations", "paginatedQuotations"],
        });
      },
    });

  const {
    mutate: softDeleteQuotationMutation,
    status: softDeleteQuotationStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting quotation:", error);
      toast.error("Failed to delete quotation");
    },
  });

  const { mutate: deleteQuotationMutation, status: deleteQuotationStatus } =
    useMutation({
      mutationFn: (id: string) => deleteQuotation(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["quotations"] });
        toast.success("Quotation deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting quotation:", error);
        toast.error("Failed to delete quotation");
      },
    });

  return {
    quotations: getAllQuotations
      ? allQuotationsQuery.data
      : paginatedQuotationsQuery.data?.documents ||
        ([] as QuotationWithRelations[]),
    totalItems: paginatedQuotationsQuery.data?.total || 0,
    isLoading: getAllQuotations
      ? allQuotationsQuery.isLoading
      : paginatedQuotationsQuery.isLoading,
    error: getAllQuotations
      ? allQuotationsQuery.error
      : paginatedQuotationsQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
