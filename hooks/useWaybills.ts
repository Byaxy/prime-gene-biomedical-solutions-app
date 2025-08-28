import {
  addWaybill,
  convertLoanWaybill,
  deleteWaybill,
  editWaybill,
  getWaybills,
  softDeleteWaybill,
} from "@/lib/actions/waybill.actions";
import {
  ConvertLoanWaybillFormValues,
  WaybillFormValues,
} from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export interface WaybillFilters {
  waybillDate_start?: string;
  waybillDate_end?: string;
  status?: string;
}

interface UseWaybillsOptions {
  getAllWaybills?: boolean;
  initialPageSize?: number;
}

export interface WaybillFilters {
  waybillDate_start?: string;
  waybillDate_end?: string;
  status?: string;
}

export const defaultWaybillFilters: WaybillFilters = {
  waybillDate_start: undefined,
  waybillDate_end: undefined,
  status: undefined,
};

export const useWaybills = ({
  getAllWaybills = false,
  initialPageSize = 10,
}: UseWaybillsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<WaybillFilters>(defaultWaybillFilters);

  const shouldFetchAll = getAllWaybills;

  const isShowAllMode = pageSize === 0;

  // Query for all Waybills
  const allWaybillsQuery = useQuery({
    queryKey: ["waybills", filters],
    queryFn: async () => {
      const result = await getWaybills(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Waybills
  const paginatedWaybillsQuery = useQuery({
    queryKey: ["waybills", "paginatedWaybills", page, pageSize, filters],
    queryFn: async () => {
      const result = await getWaybills(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allWaybillsQuery : paginatedWaybillsQuery;
  const waybills =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedWaybillsQuery.data &&
      page * pageSize < paginatedWaybillsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "waybills",
          "paginatedWaybills",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getWaybills(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedWaybillsQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);
  // Handle filter changes
  const handleFilterChange = (newFilters: WaybillFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add Waybill Mutation
  const { mutate: addWaybillMutation, status: addWaybillStatus } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: WaybillFormValues;
      userId: string;
    }) => addWaybill(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waybills"] });
    },
  });

  // Convert Loan Waybill Mutation
  const {
    mutate: convertLoanWaybillMutation,
    status: convertLoanWaybillStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      loanWaybillId,
    }: {
      data: ConvertLoanWaybillFormValues;
      loanWaybillId: string;
    }) => convertLoanWaybill(data, loanWaybillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waybills"] });
    },
  });

  // Edit Waybill Mutation
  const { mutate: editWaybillMutation, status: editWaybillStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        userId,
      }: {
        id: string;
        data: WaybillFormValues;
        userId: string;
      }) => editWaybill(data, id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["waybills", "paginatedWaybills"],
        });
      },
    });

  const { mutate: deleteWaybillMutation, status: deleteWaybillStatus } =
    useMutation({
      mutationFn: ({ id, userId }: { id: string; userId: string }) =>
        deleteWaybill(id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["waybills", "paginatedWaybills"],
        });
        toast.success("Waybill deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting waybill:", error);
        toast.error("Failed to delete waybill");
      },
    });

  const { mutate: softDeleteWaybillMutation, status: softDeleteWaybillStatus } =
    useMutation({
      mutationFn: ({ id, userId }: { id: string; userId: string }) =>
        softDeleteWaybill(id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["waybills", "paginatedWaybills"],
        });
      },
    });

  return {
    waybills,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
    page,
    setPage,
    pageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultWaybillFilters,
    addWaybill: addWaybillMutation,
    isAddingWaybill: addWaybillStatus === "pending",
    editWaybill: editWaybillMutation,
    isEditingWaybill: editWaybillStatus === "pending",
    deleteWaybill: deleteWaybillMutation,
    isDeletingWaybill: deleteWaybillStatus === "pending",
    softDeleteWaybill: softDeleteWaybillMutation,
    isSoftDeletingWaybill: softDeleteWaybillStatus === "pending",
    convertLoanWaybill: convertLoanWaybillMutation,
    isConvertingLoanWaybill: convertLoanWaybillStatus === "pending",
  };
};
