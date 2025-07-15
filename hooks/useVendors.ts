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
import toast from "react-hot-toast";

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

  // Query for all Vendors
  const allVendorsQuery = useQuery({
    queryKey: ["vendors", "allVendors"],
    queryFn: async () => {
      const result = await getVendors(0, 0, true);
      return result.documents;
    },
    enabled: getAllVendors,
  });

  // Query for paginated Vendors
  const paginatedVendorsQuery = useQuery({
    queryKey: ["vendors", "paginatedVendors", page, pageSize],
    queryFn: async () => {
      const result = await getVendors(page, pageSize, false);
      return result;
    },
    enabled: !getAllVendors,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllVendors &&
      paginatedVendorsQuery.data &&
      page * pageSize < paginatedVendorsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["vendors", "paginatedVendors", page + 1, pageSize],
        queryFn: () => getVendors(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedVendorsQuery.data, queryClient, getAllVendors]);

  // Add vendor mutation
  const { mutate: addVendorMutation, status: addVendorStatus } = useMutation({
    mutationFn: (data: VendorFormValues) => addVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("vendor added successfully");
    },
    onError: (error) => {
      console.error("Error adding vendor:", error);
      toast.error("Failed to add vendor");
    },
  });

  // Edit vendor mutation
  const { mutate: editVendorMutation, status: editVendorStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VendorFormValues }) =>
      editVendor(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated successfully");
    },
    onError: (error) => {
      console.error("Error updating vendor:", error);
      toast.error("Failed to update vendor");
    },
  });

  // Soft Delete vendor mutation
  const { mutate: softDeleteVendorMutation, status: softDeleteVendorStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteVendor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
        toast.success("vendor deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting vendor:", error);
        toast.error("Failed to delete vendor");
      },
    });

  // Permanently Delete vendor mutation
  const { mutate: deleteVendorMutation, status: deleteVendorStatus } =
    useMutation({
      mutationFn: (id: string) => deleteVendor(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
        toast.success("Vendor deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting vendor:", error);
        toast.error("Failed to delete vendor");
      },
    });

  return {
    vendors: getAllVendors
      ? allVendorsQuery.data
      : paginatedVendorsQuery.data?.documents || [],
    totalItems: paginatedVendorsQuery.data?.total || 0,
    isLoading: getAllVendors
      ? allVendorsQuery.isLoading
      : paginatedVendorsQuery.isLoading,
    error: getAllVendors ? allVendorsQuery.error : paginatedVendorsQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addVendor: addVendorMutation,
    isAddingVendor: addVendorStatus === "pending",
    editVendor: editVendorMutation,
    isEditingVendor: editVendorStatus === "pending",
    softDeleteVendor: softDeleteVendorMutation,
    isSoftDeletingVendor: softDeleteVendorStatus === "pending",
    deleteVendor: deleteVendorMutation,
    isDeletingVendor: deleteVendorStatus === "pending",
    refetch: getAllVendors
      ? allVendorsQuery.refetch
      : paginatedVendorsQuery.refetch,
    isRefetching: getAllVendors
      ? allVendorsQuery.isRefetching
      : paginatedVendorsQuery.isRefetching,
  };
};
