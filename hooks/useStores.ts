import {
  addStore,
  deleteStore,
  editStore,
  getStores,
  softDeleteStore,
} from "@/lib/actions/store.actions";
import { StoreFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseStoresOptions {
  getAllStores?: boolean;
  initialPageSize?: number;
}

export const useStores = ({
  getAllStores = false,
  initialPageSize = 10,
}: UseStoresOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shouldFetchAll = getAllStores;

  const isShowAllMode = pageSize === 0;

  // Query for all Stores
  const allStoresQuery = useQuery({
    queryKey: ["stores", "allStores"],
    queryFn: async () => {
      const result = await getStores(0, 0, true);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Stores
  const paginatedStoresQuery = useQuery({
    queryKey: ["stores", "paginatedStores", page, pageSize],
    queryFn: async () => {
      const result = await getStores(page, pageSize, false);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allStoresQuery : paginatedStoresQuery;
  const stores =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedStoresQuery.data &&
      page * pageSize < paginatedStoresQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["stores", "paginatedStores", page + 1, pageSize],
        queryFn: () => getStores(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedStoresQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
  ]);

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add Store mutation
  const { mutate: addStoreMutation, status: addStoreStatus } = useMutation({
    mutationFn: (data: StoreFormValues) => addStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Store added successfully");
    },
    onError: (error) => {
      console.error("Error adding store:", error);
      toast.error("Failed to add store");
    },
  });

  // Edit store mutation
  const { mutate: editStoreMutation, status: editStoreStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StoreFormValues }) =>
      editStore(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Store updated successfully");
    },
    onError: (error) => {
      console.error("Error updating store:", error);
      toast.error("Failed to update store");
    },
  });

  // Soft Delete store mutation
  const { mutate: softDeleteStoreMutation, status: softDeleteStoreStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteStore(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["stores"] });
        toast.success("Store deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting store:", error);
        toast.error("Failed to delete store");
      },
    });

  // Permanently Delete store mutation
  const { mutate: deleteStoreMutation, status: deleteStoreStatus } =
    useMutation({
      mutationFn: (id: string) => deleteStore(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["stores"] });
        toast.success("Store deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting store:", error);
        toast.error("Failed to delete store");
      },
    });

  return {
    stores,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
    page,
    setPage,
    pageSize,
    addStore: addStoreMutation,
    isAddingStore: addStoreStatus === "pending",
    editStore: editStoreMutation,
    isEditingStore: editStoreStatus === "pending",
    softDeleteStore: softDeleteStoreMutation,
    isSoftDeletingStore: softDeleteStoreStatus === "pending",
    deleteStore: deleteStoreMutation,
    isDeletingStore: deleteStoreStatus === "pending",
  };
};
