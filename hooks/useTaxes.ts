import {
  addTax,
  deleteTax,
  editTax,
  getTaxes,
  softDeleteTax,
} from "@/lib/actions/tax.actions";
import { TaxFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseTaxesOptions {
  getAllTaxes?: boolean;
  initialPageSize?: number;
}

export const useTaxes = ({
  getAllTaxes = false,
  initialPageSize = 10,
}: UseTaxesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shouldFetchAll = getAllTaxes;

  const isShowAllMode = pageSize === 0;

  // Query for all Taxs
  const allTaxesQuery = useQuery({
    queryKey: ["taxes", "allTaxes"],
    queryFn: async () => {
      const result = await getTaxes(0, 0, true);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Taxs
  const paginatedTaxesQuery = useQuery({
    queryKey: ["taxes", "paginatedTaxes", page, pageSize],
    queryFn: async () => {
      const result = await getTaxes(page, pageSize, false);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allTaxesQuery : paginatedTaxesQuery;
  const taxes =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedTaxesQuery.data &&
      page * pageSize < paginatedTaxesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["taxes", "paginatedTaxes", page + 1, pageSize],
        queryFn: () => getTaxes(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedTaxesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
  ]);

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add Tax mutation
  const { mutate: addTaxMutation, status: addTaxStatus } = useMutation({
    mutationFn: (data: TaxFormValues) => addTax(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax added successfully");
    },
    onError: (error) => {
      console.error("Error adding tax:", error);
      toast.error("Failed to add tax");
    },
  });

  // Edit tax mutation
  const { mutate: editTaxMutation, status: editTaxStatus } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaxFormValues }) =>
      editTax(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax updated successfully");
    },
    onError: (error) => {
      console.error("Error updating Tax:", error);
      toast.error("Failed to update Tax");
    },
  });

  // Soft Delete Tax mutation
  const { mutate: softDeleteTaxMutation, status: softDeleteTaxStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteTax(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["taxes"] });
        toast.success("Tax deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting Tax:", error);
        toast.error("Failed to delete Tax");
      },
    });

  // Permanently Delete Tax mutation
  const { mutate: deleteTaxMutation, status: deleteTaxStatus } = useMutation({
    mutationFn: (id: string) => deleteTax(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting tax:", error);
      toast.error("Failed to delete tax");
    },
  });

  return {
    taxes,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isFetching: activeQuery.isFetching,
    page,
    setPage,
    pageSize,
    addTax: addTaxMutation,
    isAddingTax: addTaxStatus === "pending",
    editTax: editTaxMutation,
    isEditingTax: editTaxStatus === "pending",
    softDeleteTax: softDeleteTaxMutation,
    isSoftDeletingTax: softDeleteTaxStatus === "pending",
    deleteTax: deleteTaxMutation,
    isDeletingTax: deleteTaxStatus === "pending",
  };
};
