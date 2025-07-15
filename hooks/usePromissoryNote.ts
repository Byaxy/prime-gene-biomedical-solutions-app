"use client";

import {
  addPromissoryNote,
  deletePromissoryNote,
  editPromissoryNote,
  getPromissoryNotes,
  softDeletePromissoryNote,
} from "@/lib/actions/promissoryNote.actions";
import { PromissoryNoteFormValues } from "@/lib/validation";
import { PromissoryNoteWithRelations } from "@/types";
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

  // Query for all PromissoryNotes
  const allPromissoryNotesQuery = useQuery({
    queryKey: ["promissoryNotes", "allPromissoryNotes", filters],
    queryFn: async () => {
      const result = await getPromissoryNotes(0, 0, true, filters);
      return result.documents;
    },
    enabled: getAllPromissoryNotes,
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
    enabled: !getAllPromissoryNotes,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllPromissoryNotes &&
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
    getAllPromissoryNotes,
    filters,
  ]);
  // Handle filter changes
  const handleFilterChange = (newFilters: PromissoryNoteFilters) => {
    setFilters(newFilters);
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
    promissoryNotes: getAllPromissoryNotes
      ? allPromissoryNotesQuery.data
      : paginatedPromissoryNotesQuery.data?.documents ||
        ([] as PromissoryNoteWithRelations[]),
    totalItems: paginatedPromissoryNotesQuery.data?.total || 0,
    isLoading: getAllPromissoryNotes
      ? allPromissoryNotesQuery.isLoading
      : paginatedPromissoryNotesQuery.isLoading,
    error: getAllPromissoryNotes
      ? allPromissoryNotesQuery.error
      : paginatedPromissoryNotesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
    refetch: getAllPromissoryNotes
      ? allPromissoryNotesQuery.refetch
      : paginatedPromissoryNotesQuery.refetch,
    isRefetching: getAllPromissoryNotes
      ? allPromissoryNotesQuery.isRefetching
      : paginatedPromissoryNotesQuery.isRefetching,
  };
};
