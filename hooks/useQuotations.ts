"use client";

import {
  addQuotation,
  deleteQuotation,
  editQuotation,
  getQuotations,
} from "@/lib/actions/quotation.actions";
import { QuotationFormValues } from "@/lib/validation";
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
        return addQuotation(data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["quotations"] });
        toast.success("Quotation created successfully");
      },
      onError: (error) => {
        console.error("Error creating quotation:", error);
        toast.error("Failed to create quotation");
      },
    });

  const { mutate: editQuotationMutation, status: editQuotationStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: QuotationFormValues;
      }) => {
        return editQuotation(data, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["quotations"] });
        toast.success("Quotation updated successfully");
      },
      onError: (error) => {
        console.error("Error updating quotation:", error);
        toast.error("Failed to update quotation");
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
      : paginatedQuotationsQuery.data?.documents || [],
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
  };
};
