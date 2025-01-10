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

export const usePurchases = () => {
  const queryClient = useQueryClient();

  const {
    data: purchases,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const result = await getPurchases();
      if (!result) {
        throw new Error("Failed to fetch purchases");
      }
      return result;
    },
  });

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
    purchases,
    isLoading,
    error,
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
