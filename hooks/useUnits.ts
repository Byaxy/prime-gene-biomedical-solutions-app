import {
  addUnit,
  deleteUnit,
  editUnit,
  getUnits,
  softDeleteUnit,
} from "@/lib/actions/unit.actions";
import { UnitFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useUnits = () => {
  const queryClient = useQueryClient();

  // Get all units
  const {
    data: units,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const result = await getUnits();

      if (!result) {
        throw new Error("Failed to fetch units");
      }
      return result;
    },
  });

  // Add unit mutation
  const { mutate: addUnitMutation, status: addUnitStatus } = useMutation({
    mutationFn: (data: UnitFormValues) => addUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit added successfully");
    },
    onError: (error) => {
      console.error("Error adding unit:", error);
      toast.error("Failed to add unit");
    },
  });

  // Edit unit mutation
  const { mutate: editUnitMutation, status: editUnitStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitFormValues }) =>
      editUnit(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit updated successfully");
    },
    onError: (error) => {
      console.error("Error updating unit:", error);
      toast.error("Failed to update unit");
    },
  });

  // Soft Delete unit mutation
  const { mutate: softDeleteUnitMutation, status: softDeleteUnitStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteUnit(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["units"] });
        toast.success("Unit deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting unit:", error);
        toast.error("Failed to delete unit");
      },
    });

  // Permanently Delete unit mutation
  const { mutate: deleteUnitMutation, status: deleteUnitStatus } = useMutation({
    mutationFn: (id: string) => deleteUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting unit:", error);
      toast.error("Failed to delete unit");
    },
  });

  return {
    units,
    isLoading,
    error,
    addUnit: addUnitMutation,
    isAddingUnit: addUnitStatus === "pending",
    editUnit: editUnitMutation,
    isEditingUnit: editUnitStatus === "pending",
    softDeleteUnit: softDeleteUnitMutation,
    isSoftDeletingUnit: softDeleteUnitStatus === "pending",
    deleteUnit: deleteUnitMutation,
    isDeletingUnit: deleteUnitStatus === "pending",
  };
};
