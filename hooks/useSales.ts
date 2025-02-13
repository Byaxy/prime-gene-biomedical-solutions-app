import {
  addSale,
  deleteSale,
  editSale,
  getSales,
} from "@/lib/actions/sale.actions";
import { SaleFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseSalesOptions {
  getAllSales?: boolean;
  initialPageSize?: number;
}

export const useSales = ({
  getAllSales = false,
  initialPageSize = 10,
}: UseSalesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Sales
  const allSalesQuery = useQuery({
    queryKey: ["sales", "allSales"],
    queryFn: async () => {
      const result = await getSales(0, 0, true);
      return result.documents;
    },
    enabled: getAllSales,
  });

  // Query for paginated Sales
  const paginatedSalesQuery = useQuery({
    queryKey: ["sales", "paginatedSales", page, pageSize],
    queryFn: async () => {
      const result = await getSales(page, pageSize, false);
      return result;
    },
    enabled: !getAllSales,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllSales &&
      paginatedSalesQuery.data &&
      page * pageSize < paginatedSalesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["sales", "paginatedSales", page + 1, pageSize],
        queryFn: () => getSales(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedSalesQuery.data, queryClient, getAllSales]);

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
    sales: getAllSales
      ? allSalesQuery.data
      : paginatedSalesQuery.data?.documents || [],
    totalItems: paginatedSalesQuery.data?.total || 0,
    isLoading: getAllSales
      ? allSalesQuery.isLoading
      : paginatedSalesQuery.isLoading,
    error: getAllSales ? allSalesQuery.error : paginatedSalesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addSale: addSaleMutation,
    isAddingSale: addSaleStatus === "pending",
    editSale: editSaleMutation,
    isEditingSale: editSaleStatus === "pending",
    deleteSale: deleteSaleMutation,
    isDeletingSale: deleteSaleStatus === "pending",
  };
};
