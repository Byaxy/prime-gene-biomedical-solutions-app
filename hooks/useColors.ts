import {
  addColor,
  deleteColor,
  editColor,
  getColors,
  softDeleteColor,
} from "@/lib/actions/color.actions";
import { ColorFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseColorsOptions {
  getAllColors?: boolean;
  initialPageSize?: number;
}

export const useColors = ({
  getAllColors = false,
  initialPageSize = 10,
}: UseColorsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all colors
  const allColorsQuery = useQuery({
    queryKey: ["colors", "allColors"],
    queryFn: async () => {
      const result = await getColors(0, 0, true);
      return result.documents;
    },
    enabled: getAllColors,
  });

  // Query for paginated colors
  const paginatedColorsQuery = useQuery({
    queryKey: ["colors", "paginatedColors", page, pageSize],
    queryFn: async () => {
      const result = await getColors(page, pageSize, false);
      return result;
    },
    enabled: !getAllColors,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllColors &&
      paginatedColorsQuery.data &&
      page * pageSize < paginatedColorsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["colors", "paginatedColors", page + 1, pageSize],
        queryFn: () => getColors(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedColorsQuery.data, queryClient, getAllColors]);

  // Add color mutation
  const { mutate: addColorMutation, status: addColorStatus } = useMutation({
    mutationFn: (data: ColorFormValues) => addColor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      toast.success("Color added successfully");
    },
    onError: (error) => {
      console.error("Error adding color:", error);
      toast.error("Failed to add color");
    },
  });

  // Edit color mutation
  const { mutate: editColorMutation, status: editColorStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ColorFormValues }) =>
      editColor(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      toast.success("Color updated successfully");
    },
    onError: (error) => {
      console.error("Error updating color:", error);
      toast.error("Failed to update color");
    },
  });

  // Soft Delete color mutation
  const { mutate: softDeleteColorMutation, status: softDeleteColorStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteColor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["colors"] });
        toast.success("Color deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting color:", error);
        toast.error("Failed to delete color");
      },
    });

  // Permanently Delete color mutation
  const { mutate: deleteColorMutation, status: deleteColorStatus } =
    useMutation({
      mutationFn: (id: string) => deleteColor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["colors"] });
        toast.success("Color deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting color:", error);
        toast.error("Failed to delete color");
      },
    });

  return {
    productColors: getAllColors
      ? allColorsQuery.data
      : paginatedColorsQuery.data?.documents || [],
    totalItems: paginatedColorsQuery.data?.total || 0,
    isLoading: getAllColors
      ? allColorsQuery.isLoading
      : paginatedColorsQuery.isLoading,
    error: getAllColors ? allColorsQuery.error : paginatedColorsQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addColor: addColorMutation,
    isAddingColor: addColorStatus === "pending",
    editColor: editColorMutation,
    isEditingColor: editColorStatus === "pending",
    softDeleteColor: softDeleteColorMutation,
    isSoftDeletingColor: softDeleteColorStatus === "pending",
    deleteColor: deleteColorMutation,
    isDeletingColor: deleteColorStatus === "pending",
  };
};
