"use client";

import {
  addPromissoryNote,
  deletePromissoryNote,
  editPromissoryNote,
  getPromissoryNotes,
  softDeletePromissoryNote,
} from "@/lib/actions/promissoryNote.actions";
import { PromissoryNoteFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export interface PromissoryNoteFilters {
  promissoryNoteDate_start?: string;
  promissoryNoteDate_end?: string;
  status?: string;
}

interface UsePromissoryNotesOptions {
  getAllPromissoryNotes?: boolean;
  initialPageSize?: number;
}

export const defaultPromissoryNoteFilters: PromissoryNoteFilters = {
  promissoryNoteDate_start: undefined,
  promissoryNoteDate_end: undefined,
  status: undefined,
};

export const usePromissoryNote = ({
  getAllPromissoryNotes = false,
  initialPageSize = 10,
}: UsePromissoryNotesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<PromissoryNoteFilters>(
    defaultPromissoryNoteFilters
  );

  const shouldFetchAll = getAllPromissoryNotes;

  const isShowAllMode = pageSize === 0;

  // Query for all PromissoryNotes
  const allPromissoryNotesQuery = useQuery({
    queryKey: ["promissoryNotes", filters],
    queryFn: async () => {
      const result = await getPromissoryNotes(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated PromissoryNotes
  const paginatedPromissoryNotesQuery = useQuery({
    queryKey: [
      "promissoryNotes",
      "paginatedPromissoryNotes",
      page,
      pageSize,
      filters,
    ],
    queryFn: async () => {
      const result = await getPromissoryNotes(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allPromissoryNotesQuery
      : paginatedPromissoryNotesQuery;
  const promissoryNotes =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedPromissoryNotesQuery.data &&
      page * pageSize < paginatedPromissoryNotesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "promissoryNotes",
          "paginatedPromissoryNotes",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getPromissoryNotes(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedPromissoryNotesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);
  // Handle filter changes
  const handleFilterChange = (newFilters: PromissoryNoteFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add PromissoryNote Mutation
  const { mutate: addPromissoryNoteMutation, status: addPromissoryNoteStatus } =
    useMutation({
      mutationFn: async ({ data }: { data: PromissoryNoteFormValues }) =>
        addPromissoryNote(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["promissoryNotes"] });
      },
    });

  // Edit PromissoryNote Mutation
  const {
    mutate: editPromissoryNoteMutation,
    status: editPromissoryNoteStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: PromissoryNoteFormValues;
    }) => editPromissoryNote(data, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["promissoryNotes", "paginatedPromissoryNotes"],
      });
    },
  });

  const {
    mutate: deletePromissoryNoteMutation,
    status: deletePromissoryNoteStatus,
  } = useMutation({
    mutationFn: (id: string) => deletePromissoryNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["promissoryNotes", "paginatedPromissoryNotes"],
      });
      toast.success("PromissoryNote deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting PromissoryNote:", error);
      toast.error("Failed to delete PromissoryNote");
    },
  });

  const {
    mutate: softDeletePromissoryNoteMutation,
    status: softDeletePromissoryNoteStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeletePromissoryNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["promissoryNotes", "paginatedPromissoryNotes"],
      });
    },
  });

  return {
    promissoryNotes,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isFetching: activeQuery.isFetching,
    page,
    setPage,
    pageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultPromissoryNoteFilters,
    addPromissoryNote: addPromissoryNoteMutation,
    isAddingPromissoryNote: addPromissoryNoteStatus === "pending",
    editPromissoryNote: editPromissoryNoteMutation,
    isEditingPromissoryNote: editPromissoryNoteStatus === "pending",
    deletePromissoryNote: deletePromissoryNoteMutation,
    isDeletingPromissoryNote: deletePromissoryNoteStatus === "pending",
    softDeletePromissoryNote: softDeletePromissoryNoteMutation,
    isSoftDeletingPromissoryNote: softDeletePromissoryNoteStatus === "pending",
  };
};
