import {
  addColor,
  deleteColor,
  editColor,
  getColors,
  softDeleteColor,
} from "@/lib/actions/color.actions";
import { ColorFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useColors = () => {
  const queryClient = useQueryClient();

  // Get all colors
  const {
    data: productColors,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["colors"],
    queryFn: async () => {
      const result = await getColors();

      if (!result) {
        throw new Error("Failed to fetch colors");
      }
      return result;
    },
  });

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
    productColors,
    isLoading,
    error,
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
