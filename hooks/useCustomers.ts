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

export const useCustomers = () => {
  const queryClient = useQueryClient();

  // Get all customers
  const {
    data: customers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const result = await getCustomers();

      if (!result) {
        throw new Error("Failed to fetch customers");
      }
      return result;
    },
  });

  // Add customer mutation
  const { mutate: addCustomerMutation, status: addCustomerStatus } =
    useMutation({
      mutationFn: (data: CustomerFormValues) => addCustomer(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Customer added successfully");
      },
      onError: (error) => {
        console.error("Error adding customer:", error);
        toast.error("Failed to add customer");
      },
    });

  // Edit customer mutation
  const { mutate: editCustomerMutation, status: editCustomerStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: CustomerFormValues }) =>
        editCustomer(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Customer updated successfully");
      },
      onError: (error) => {
        console.error("Error updating customer:", error);
        toast.error("Failed to update customer");
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
    customers,
    isLoading,
    error,
    addCustomer: addCustomerMutation,
    isAddingCustomer: addCustomerStatus === "pending",
    editCustomer: editCustomerMutation,
    isEditingCustomer: editCustomerStatus === "pending",
    softDeleteCustomer: softDeleteCustomerMutation,
    isSoftDeletingCustomer: softDeleteCustomerStatus === "pending",
    deleteCustomer: deleteCustomerMutation,
    isDeletingCustomer: deleteCustomerStatus === "pending",
  };
};
