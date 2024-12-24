import {
  addMaterial,
  deleteMaterial,
  editMaterial,
  getMaterials,
  softDeleteMaterial,
} from "@/lib/actions/material.actions";
import { MaterialFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useMaterials = () => {
  const queryClient = useQueryClient();

  // Get all materials
  const {
    data: materials,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const result = await getMaterials();

      if (!result) {
        throw new Error("Failed to fetch materials");
      }
      return result;
    },
  });

  // Add material mutation
  const { mutate: addMaterialMutation, status: addMaterialStatus } =
    useMutation({
      mutationFn: (data: MaterialFormValues) => addMaterial(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["materials"] });
        toast.success("Material added successfully");
      },
      onError: (error) => {
        console.error("Error adding material:", error);
        toast.error("Failed to add material");
      },
    });

  // Edit material mutation
  const { mutate: editMaterialMutation, status: editMaterialStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: MaterialFormValues }) =>
        editMaterial(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["materials"] });
        toast.success("Material updated successfully");
      },
      onError: (error) => {
        console.error("Error updating material:", error);
        toast.error("Failed to update material");
      },
    });

  // Soft Delete material mutation
  const {
    mutate: softDeleteMaterialMutation,
    status: softDeleteMaterialStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting material:", error);
      toast.error("Failed to delete material");
    },
  });

  // Permanently Delete material mutation
  const { mutate: deleteMaterialMutation, status: deleteMaterialStatus } =
    useMutation({
      mutationFn: (id: string) => deleteMaterial(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["materials"] });
        toast.success("Material deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting material:", error);
        toast.error("Failed to delete material");
      },
    });

  return {
    materials,
    isLoading,
    error,
    addMaterial: addMaterialMutation,
    isAddingMaterial: addMaterialStatus === "pending",
    editMaterial: editMaterialMutation,
    isEditingMaterial: editMaterialStatus === "pending",
    softDeleteMaterial: softDeleteMaterialMutation,
    isSoftDeletingMaterial: softDeleteMaterialStatus === "pending",
    deleteMaterial: deleteMaterialMutation,
    isDeletingMaterial: deleteMaterialStatus === "pending",
  };
};
