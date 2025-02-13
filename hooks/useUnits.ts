import {
  addUnit,
  deleteUnit,
  editUnit,
  getUnits,
  softDeleteUnit,
} from "@/lib/actions/unit.actions";
import { UnitFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseUnitsOptions {
  getAllUnits?: boolean;
  initialPageSize?: number;
}

export const useUnits = ({
  getAllUnits = false,
  initialPageSize = 10,
}: UseUnitsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Units
  const allUnitsQuery = useQuery({
    queryKey: ["units", "allUnits"],
    queryFn: async () => {
      const result = await getUnits(0, 0, true);
      return result.documents;
    },
    enabled: getAllUnits,
  });

  // Query for paginated Units
  const paginatedUnitsQuery = useQuery({
    queryKey: ["units", "paginatedUnits", page, pageSize],
    queryFn: async () => {
      const result = await getUnits(page, pageSize, false);
      return result;
    },
    enabled: !getAllUnits,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllUnits &&
      paginatedUnitsQuery.data &&
      page * pageSize < paginatedUnitsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["units", "paginatedUnits", page + 1, pageSize],
        queryFn: () => getUnits(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedUnitsQuery.data, queryClient, getAllUnits]);

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
    units: getAllUnits
      ? allUnitsQuery.data
      : paginatedUnitsQuery.data?.documents || [],
    totalItems: paginatedUnitsQuery.data?.total || 0,
    isLoading: getAllUnits
      ? allUnitsQuery.isLoading
      : paginatedUnitsQuery.isLoading,
    error: getAllUnits ? allUnitsQuery.error : paginatedUnitsQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
