import {
  addSupplier,
  deleteSupplier,
  editSupplier,
  getSuppliers,
  softDeleteSupplier,
} from "@/lib/actions/supplier.actions";
import { SupplierFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useSuppliers = () => {
  const queryClient = useQueryClient();

  // Get all suppliers
  const {
    data: suppliers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const result = await getSuppliers();

      if (!result) {
        throw new Error("Failed to fetch suppliers");
      }
      return result;
    },
  });

  // Add supplier mutation
  const { mutate: addSupplierMutation, status: addSupplierStatus } =
    useMutation({
      mutationFn: (data: SupplierFormValues) => addSupplier(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Supplier added successfully");
      },
      onError: (error) => {
        console.error("Error adding supplier:", error);
        toast.error("Failed to add supplier");
      },
    });

  // Edit supplier mutation
  const { mutate: editSupplierMutation, status: editSupplierStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: SupplierFormValues }) =>
        editSupplier(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Supplier updated successfully");
      },
      onError: (error) => {
        console.error("Error updating supplier:", error);
        toast.error("Failed to update supplier");
      },
    });

  // Soft Delete supplier mutation
  const {
    mutate: softDeleteSupplierMutation,
    status: softDeleteSupplierStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier");
    },
  });

  // Permanently Delete supplier mutation
  const { mutate: deleteSupplierMutation, status: deleteSupplierStatus } =
    useMutation({
      mutationFn: (id: string) => deleteSupplier(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Supplier deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting supplier:", error);
        toast.error("Failed to delete supplier");
      },
    });

  return {
    suppliers,
    isLoading,
    error,
    addSupplier: addSupplierMutation,
    isAddingSupplier: addSupplierStatus === "pending",
    editSupplier: editSupplierMutation,
    isEditingSupplier: editSupplierStatus === "pending",
    softDeleteSupplier: softDeleteSupplierMutation,
    isSoftDeletingSupplier: softDeleteSupplierStatus === "pending",
    deleteSupplier: deleteSupplierMutation,
    isDeletingSupplier: deleteSupplierStatus === "pending",
  };
};
