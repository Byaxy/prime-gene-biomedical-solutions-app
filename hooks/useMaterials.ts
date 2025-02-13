import { useEffect, useState } from "react";
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

interface UseMaterialsOptions {
  getAllMaterials?: boolean;
  initialPageSize?: number;
}

export const useMaterials = ({
  getAllMaterials = false,
  initialPageSize = 10,
}: UseMaterialsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Materials
  const allMaterialsQuery = useQuery({
    queryKey: ["materials", "allMaterials"],
    queryFn: async () => {
      const result = await getMaterials(0, 0, true);
      return result.documents;
    },
    enabled: getAllMaterials,
  });

  // Query for paginated Materials
  const paginatedMaterialsQuery = useQuery({
    queryKey: ["materials", "paginatedMaterials", page, pageSize],
    queryFn: async () => {
      const result = await getMaterials(page, pageSize, false);
      return result;
    },
    enabled: !getAllMaterials,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllMaterials &&
      paginatedMaterialsQuery.data &&
      page * pageSize < paginatedMaterialsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["materials", "paginatedMaterials", page + 1, pageSize],
        queryFn: () => getMaterials(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedMaterialsQuery.data,
    queryClient,
    getAllMaterials,
  ]);

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
    materials: getAllMaterials
      ? allMaterialsQuery.data
      : paginatedMaterialsQuery.data?.documents || [],
    totalItems: paginatedMaterialsQuery.data?.total || 0,
    isLoading: getAllMaterials
      ? allMaterialsQuery.isLoading
      : paginatedMaterialsQuery.isLoading,
    error: getAllMaterials
      ? allMaterialsQuery.error
      : paginatedMaterialsQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
