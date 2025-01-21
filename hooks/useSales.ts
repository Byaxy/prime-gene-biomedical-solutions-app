import {
  addSale,
  deleteSale,
  editSale,
  getSales,
} from "@/lib/actions/sale.actions";
import { SaleFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useSales = () => {
  const queryClient = useQueryClient();

  const {
    data: sales,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const result = await getSales();
      if (!result) {
        throw new Error("Failed to fetch sales");
      }
      return result;
    },
  });

  const { mutate: addSaleMutation, status: addSaleStatus } = useMutation({
    mutationFn: async (data: SaleFormValues) => {
      return addSale(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale created successfully");
    },
    onError: (error) => {
      console.error("Error creating sale:", error);
      toast.error("Failed to create sale");
    },
  });

  const { mutate: editSaleMutation, status: editSaleStatus } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SaleFormValues }) => {
      return editSale(data, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale updated successfully");
    },
    onError: (error) => {
      console.error("Error updating sale:", error);
      toast.error("Failed to update sale");
    },
  });

  const { mutate: deleteSaleMutation, status: deleteSaleStatus } = useMutation({
    mutationFn: (id: string) => deleteSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sale deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting sale:", error);
      toast.error("Failed to delete sale");
    },
  });

  return {
    sales,
    isLoading,
    error,
    addSale: addSaleMutation,
    isAddingSale: addSaleStatus === "pending",
    editSale: editSaleMutation,
    isEditingSale: editSaleStatus === "pending",
    deleteSale: deleteSaleMutation,
    isDeletingSale: deleteSaleStatus === "pending",
  };
};
