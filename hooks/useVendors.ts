import {
  addVendor,
  deleteVendor,
  editVendor,
  getVendors,
  softDeleteVendor,
} from "@/lib/actions/vendor.actions";
import { VendorFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface UseVendorsOptions {
  getAllVendors?: boolean;
  initialPageSize?: number;
}

export const useVendors = ({
  getAllVendors = false,
  initialPageSize = 10,
}: UseVendorsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shouldFetchAll = getAllVendors;

  const isShowAllMode = pageSize === 0;

  // Query for all Vendors
  const allVendorsQuery = useQuery({
    queryKey: ["vendors", "allVendors"],
    queryFn: async () => {
      const result = await getVendors(0, 0, true);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Vendors
  const paginatedVendorsQuery = useQuery({
    queryKey: ["vendors", "paginatedVendors", page, pageSize],
    queryFn: async () => {
      const result = await getVendors(page, pageSize, false);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allVendorsQuery : paginatedVendorsQuery;
  const vendors =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedVendorsQuery.data &&
      page * pageSize < paginatedVendorsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["vendors", "paginatedVendors", page + 1, pageSize],
        queryFn: () => getVendors(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedVendorsQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
  ]);

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add vendor mutation
  const { mutate: addVendorMutation, status: addVendorStatus } = useMutation({
    mutationFn: (data: VendorFormValues) => addVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      console.error("Error adding vendor:", error);
    },
  });

  // Edit vendor mutation
  const { mutate: editVendorMutation, status: editVendorStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VendorFormValues }) =>
      editVendor(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      console.error("Error updating vendor:", error);
    },
  });

  // Soft Delete vendor mutation
  const { mutate: softDeleteVendorMutation, status: softDeleteVendorStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteVendor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
      },
      onError: (error) => {
        console.error("Error deleting vendor:", error);
      },
    });

  // Permanently Delete vendor mutation
  const { mutate: deleteVendorMutation, status: deleteVendorStatus } =
    useMutation({
      mutationFn: (id: string) => deleteVendor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
      },
      onError: (error) => {
        console.error("Error deleting vendor:", error);
      },
    });

  return {
    vendors,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
    page,
    setPage,
    pageSize,
    addVendor: addVendorMutation,
    isAddingVendor: addVendorStatus === "pending",
    editVendor: editVendorMutation,
    isEditingVendor: editVendorStatus === "pending",
    softDeleteVendor: softDeleteVendorMutation,
    isSoftDeletingVendor: softDeleteVendorStatus === "pending",
    deleteVendor: deleteVendorMutation,
    isDeletingVendor: deleteVendorStatus === "pending",
  };
};
