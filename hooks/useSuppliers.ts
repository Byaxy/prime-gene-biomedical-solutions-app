import {
  addSupplier,
  deleteSupplier,
  editSupplier,
  getSuppliers,
  softDeleteSupplier,
} from "@/lib/actions/supplier.actions";
import { SupplierFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseSuppliersOptions {
  getAllSuppliers?: boolean;
  initialPageSize?: number;
}

export const useSuppliers = ({
  getAllSuppliers = false,
  initialPageSize = 10,
}: UseSuppliersOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Suppliers
  const allSuppliersQuery = useQuery({
    queryKey: ["suppliers", "allSuppliers"],
    queryFn: async () => {
      const result = await getSuppliers(0, 0, true);
      return result.documents;
    },
    enabled: getAllSuppliers,
  });

  // Query for paginated Suppliers
  const paginatedSuppliersQuery = useQuery({
    queryKey: ["suppliers", "paginatedSuppliers", page, pageSize],
    queryFn: async () => {
      const result = await getSuppliers(page, pageSize, false);
      return result;
    },
    enabled: !getAllSuppliers,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllSuppliers &&
      paginatedSuppliersQuery.data &&
      page * pageSize < paginatedSuppliersQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["suppliers", "paginatedSuppliers", page + 1, pageSize],
        queryFn: () => getSuppliers(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedSuppliersQuery.data,
    queryClient,
    getAllSuppliers,
  ]);

  // Add supplier mutation
  const { mutate: addSupplierMutation, status: addSupplierStatus } =
    useMutation({
      mutationFn: (data: SupplierFormValues) => addSupplier(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Supplier added successfully");
      },
      onError: (error) => {
        console.error("Error adding supplier:", error);
        toast.error("Failed to add supplier");
      },
    });

  // Edit supplier mutation
  const { mutate: editSupplierMutation, status: editSupplierStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: SupplierFormValues }) =>
        editSupplier(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Supplier updated successfully");
      },
      onError: (error) => {
        console.error("Error updating supplier:", error);
        toast.error("Failed to update supplier");
      },
    });

  // Soft Delete supplier mutation
  const {
    mutate: softDeleteSupplierMutation,
    status: softDeleteSupplierStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier");
    },
  });

  // Permanently Delete supplier mutation
  const { mutate: deleteSupplierMutation, status: deleteSupplierStatus } =
    useMutation({
      mutationFn: (id: string) => deleteSupplier(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Supplier deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting supplier:", error);
        toast.error("Failed to delete supplier");
      },
    });

  return {
    suppliers: getAllSuppliers
      ? allSuppliersQuery.data
      : paginatedSuppliersQuery.data?.documents || [],
    totalItems: paginatedSuppliersQuery.data?.total || 0,
    isLoading: getAllSuppliers
      ? allSuppliersQuery.isLoading
      : paginatedSuppliersQuery.isLoading,
    error: getAllSuppliers
      ? allSuppliersQuery.error
      : paginatedSuppliersQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addSupplier: addSupplierMutation,
    isAddingSupplier: addSupplierStatus === "pending",
    editSupplier: editSupplierMutation,
    isEditingSupplier: editSupplierStatus === "pending",
    softDeleteSupplier: softDeleteSupplierMutation,
    isSoftDeletingSupplier: softDeleteSupplierStatus === "pending",
    deleteSupplier: deleteSupplierMutation,
    isDeletingSupplier: deleteSupplierStatus === "pending",
  };
};
