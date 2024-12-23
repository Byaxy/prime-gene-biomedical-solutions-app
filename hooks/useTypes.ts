/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addType,
  deleteType,
  editType,
  getTypes,
  softDeleteType,
} from "@/lib/actions/type.actions";
import { TypeFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useTypes = () => {
  const queryClient = useQueryClient();

  // Get all types
  const {
    data: types,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["types"],
    queryFn: async () => {
      const result = await getTypes();

      if (!result) {
        throw new Error("Failed to fetch types");
      }
      return result;
    },
  });

  // Add type mutation
  const { mutate: addTypeMutation, status: addTypeStatus } = useMutation({
    mutationFn: (data: TypeFormValues) => addType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type added successfully");
    },
    onError: (error: any) => {
      console.error("Error adding type:", error);
      toast.error("Failed to add type");
    },
  });

  // Edit type mutation
  const { mutate: editTypeMutation, status: editTypeStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TypeFormValues }) =>
      editType(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type updated successfully");
    },
    onError: (error) => {
      console.error("Error updating type:", error);
      toast.error("Failed to update type");
    },
  });

  // Soft Delete type mutation
  const { mutate: softDeleteTypeMutation, status: softDeleteTypeStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteType(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["types"] });
        toast.success("Type deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting type:", error);
        toast.error("Failed to delete type");
      },
    });

  // Permanently Delete type mutation
  const { mutate: deleteTypeMutation, status: deleteTypeStatus } = useMutation({
    mutationFn: (id: string) => deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting type:", error);
      toast.error("Failed to delete type");
    },
  });

  return {
    types,
    isLoading,
    error,
    addType: addTypeMutation,
    isAddingType: addTypeStatus === "pending",
    editType: editTypeMutation,
    isEditingType: editTypeStatus === "pending",
    softDeleteType: softDeleteTypeMutation,
    isSoftDeletingType: softDeleteTypeStatus === "pending",
    deleteType: deleteTypeMutation,
    isDeletingType: deleteTypeStatus === "pending",
  };
};
