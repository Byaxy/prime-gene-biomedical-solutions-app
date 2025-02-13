import {
  addType,
  deleteType,
  editType,
  getTypes,
  softDeleteType,
} from "@/lib/actions/type.actions";
import { TypeFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseTypesOptions {
  getAllTypes?: boolean;
  initialPageSize?: number;
}

export const useTypes = ({
  getAllTypes = false,
  initialPageSize = 10,
}: UseTypesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Types
  const allTypesQuery = useQuery({
    queryKey: ["types", "allTypes"],
    queryFn: async () => {
      const result = await getTypes(0, 0, true);
      return result.documents;
    },
    enabled: getAllTypes,
  });

  // Query for paginated Types
  const paginatedTypesQuery = useQuery({
    queryKey: ["types", "paginatedTypes", page, pageSize],
    queryFn: async () => {
      const result = await getTypes(page, pageSize, false);
      return result;
    },
    enabled: !getAllTypes,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllTypes &&
      paginatedTypesQuery.data &&
      page * pageSize < paginatedTypesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["types", "paginatedTypes", page + 1, pageSize],
        queryFn: () => getTypes(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedTypesQuery.data, queryClient, getAllTypes]);

  // Add type mutation
  const { mutate: addTypeMutation, status: addTypeStatus } = useMutation({
    mutationFn: (data: TypeFormValues) => addType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
      toast.success("Type added successfully");
    },
    onError: (error) => {
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
    types: getAllTypes
      ? allTypesQuery.data
      : paginatedTypesQuery.data?.documents || [],
    totalItems: paginatedTypesQuery.data?.total || 0,
    isLoading: getAllTypes
      ? allTypesQuery.isLoading
      : paginatedTypesQuery.isLoading,
    error: getAllTypes ? allTypesQuery.error : paginatedTypesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
