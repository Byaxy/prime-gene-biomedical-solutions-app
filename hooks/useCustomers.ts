"use client";

import { useEffect, useState } from "react";
import {
  addCustomer,
  deleteCustomer,
  editCustomer,
  getCustomers,
  softDeleteCustomer,
} from "@/lib/actions/customer.actions";
import { CustomerFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface UseCustomersOptions {
  getAllCustomers?: boolean;
  initialPageSize?: number;
}

export const useCustomers = ({
  getAllCustomers = false,
  initialPageSize = 10,
}: UseCustomersOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all customers
  const allCustomersQuery = useQuery({
    queryKey: ["customers", "allCustomers"],
    queryFn: async () => {
      const result = await getCustomers(0, 0, true);
      return result.documents;
    },
    enabled: getAllCustomers,
  });

  // Query for paginated Customers
  const paginatedCustomersQuery = useQuery({
    queryKey: ["customers", "paginatedCustomers", page, pageSize],
    queryFn: async () => {
      const result = await getCustomers(page, pageSize, false);
      return result;
    },
    enabled: !getAllCustomers,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllCustomers &&
      paginatedCustomersQuery.data &&
      page * pageSize < paginatedCustomersQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["customers", "paginatedCustomers", page + 1, pageSize],
        queryFn: () => getCustomers(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedCustomersQuery.data,
    queryClient,
    getAllCustomers,
  ]);

  // Add customer mutation
  const { mutate: addCustomerMutation, status: addCustomerStatus } =
    useMutation({
      mutationFn: (data: CustomerFormValues) => addCustomer(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      },
    });

  // Edit customer mutation
  const { mutate: editCustomerMutation, status: editCustomerStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: CustomerFormValues }) =>
        editCustomer(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      },
    });

  // Soft Delete customer mutation
  const {
    mutate: softDeleteCustomerMutation,
    status: softDeleteCustomerStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    },
  });

  // Permanently Delete customer mutation
  const { mutate: deleteCustomerMutation, status: deleteCustomerStatus } =
    useMutation({
      mutationFn: (id: string) => deleteCustomer(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Customer deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting customer:", error);
        toast.error("Failed to delete customer");
      },
    });

  return {
    customers: getAllCustomers
      ? allCustomersQuery.data
      : paginatedCustomersQuery.data?.documents || [],
    totalItems: paginatedCustomersQuery.data?.total || 0,
    isLoading: getAllCustomers
      ? allCustomersQuery.isLoading
      : paginatedCustomersQuery.isLoading,
    error: getAllCustomers
      ? allCustomersQuery.error
      : paginatedCustomersQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addCustomer: addCustomerMutation,
    isAddingCustomer: addCustomerStatus === "pending",
    editCustomer: editCustomerMutation,
    isEditingCustomer: editCustomerStatus === "pending",
    softDeleteCustomer: softDeleteCustomerMutation,
    isSoftDeletingCustomer: softDeleteCustomerStatus === "pending",
    deleteCustomer: deleteCustomerMutation,
    isDeletingCustomer: deleteCustomerStatus === "pending",
    refetch: getAllCustomers
      ? allCustomersQuery.refetch
      : paginatedCustomersQuery.refetch,
    isRefetching: getAllCustomers
      ? allCustomersQuery.isRefetching
      : paginatedCustomersQuery.isRefetching,
  };
};
