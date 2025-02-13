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

interface UsePurchasesOptions {
  getAllPurchases?: boolean;
  initialPageSize?: number;
}

export const usePurchases = ({
  getAllPurchases = false,
  initialPageSize = 10,
}: UsePurchasesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Purchases
  const allPurchasesQuery = useQuery({
    queryKey: ["purchases", "allPurchases"],
    queryFn: async () => {
      const result = await getPurchases(0, 0, true);
      return result.documents;
    },
    enabled: getAllPurchases,
  });

  // Query for paginated Purchases
  const paginatedPurchasesQuery = useQuery({
    queryKey: ["purchases", "paginatedPurchases", page, pageSize],
    queryFn: async () => {
      const result = await getPurchases(page, pageSize, false);
      return result;
    },
    enabled: !getAllPurchases,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllPurchases &&
      paginatedPurchasesQuery.data &&
      page * pageSize < paginatedPurchasesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["purchases", "paginatedPurchases", page + 1, pageSize],
        queryFn: () => getPurchases(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedPurchasesQuery.data,
    queryClient,
    getAllPurchases,
  ]);

  const { mutate: addPurchaseMutation, status: addPurchaseStatus } =
    useMutation({
      mutationFn: async (data: PurchaseFormValues) => {
        return addPurchase(data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        toast.success("Purchase created successfully");
      },
      onError: (error) => {
        console.error("Error creating purchase:", error);
        toast.error("Failed to create purchase");
      },
    });

  const { mutate: editPurchaseMutation, status: editPurchaseStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: PurchaseFormValues;
      }) => {
        return editPurchase(data, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        toast.success("Purchase updated successfully");
      },
      onError: (error) => {
        console.error("Error updating purchase:", error);
        toast.error("Failed to update purchase");
      },
    });

  const {
    mutate: softDeletePurchaseMutation,
    status: softDeletePurchaseStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase deleted successfully");
    },
    onError: (error) => {
      console.error("Error soft deleting purchase:", error);
      toast.error("Failed to delete purchase");
    },
  });

  const { mutate: deletePurchaseMutation, status: deletePurchaseStatus } =
    useMutation({
      mutationFn: (id: string) => deletePurchase(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        toast.success("Purchase deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting purchase:", error);
        toast.error("Failed to delete purchase");
      },
    });

  return {
    purchases: getAllPurchases
      ? allPurchasesQuery.data
      : paginatedPurchasesQuery.data?.documents || [],
    totalItems: paginatedPurchasesQuery.data?.total || 0,
    isLoading: getAllPurchases
      ? allPurchasesQuery.isLoading
      : paginatedPurchasesQuery.isLoading,
    error: getAllPurchases
      ? allPurchasesQuery.error
      : paginatedPurchasesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
