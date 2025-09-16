"use client";

import {
  addPromissoryNote,
  deletePromissoryNote,
  editPromissoryNote,
  getPromissoryNotes,
  softDeletePromissoryNote,
} from "@/lib/actions/promissoryNote.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PromissoryNoteFormValues } from "@/lib/validation";
import { PromissoryNoteWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

export interface PromissoryNoteFilters {
  search?: string;
  promissoryNoteDate_start?: string;
  promissoryNoteDate_end?: string;
  status?: string;
}

interface UsePromissoryNotesOptions {
  getAllPromissoryNotes?: boolean;
  initialData?: { documents: PromissoryNoteWithRelations[]; total: number };
}

export const defaultPromissoryNoteFilters: PromissoryNoteFilters = {
  promissoryNoteDate_start: undefined,
  promissoryNoteDate_end: undefined,
  status: undefined,
};

export const usePromissoryNote = ({
  getAllPromissoryNotes = false,
  initialData,
}: UsePromissoryNotesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllPromissoryNotes) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: PromissoryNoteFilters = {
      search: search || undefined,
      promissoryNoteDate_start:
        searchParams.get("promissoryNoteDate_start") || undefined,
      promissoryNoteDate_end:
        searchParams.get("promissoryNoteDate_end") || undefined,
      status: searchParams.get("status") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllPromissoryNotes, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["promissoryNotes", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getPromissoryNotes(
        page,
        pageSize,
        getAllPromissoryNotes || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllPromissoryNotes ? 60000 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Optimistic navigation function
  const navigate = useCallback(
    (
      updates: Partial<{
        page: number;
        pageSize: number;
        search: string;
        filters: Partial<PromissoryNoteFilters>;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      if (updates.page !== undefined) {
        if (updates.page === 0) {
          params.delete("page");
        } else {
          params.set("page", String(updates.page));
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 10) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", String(updates.pageSize));
        }
      }

      if (updates.search !== undefined) {
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
        params.delete("page");
      }

      if (updates.filters) {
        Object.keys(defaultPromissoryNoteFilters).forEach((key) =>
          params.delete(key)
        );

        Object.entries(updates.filters).forEach(([key, value]) => {
          if (value === undefined || value === "" || value === null) {
            params.delete(key);
          } else {
            params.set(key, String(value));
          }
        });
        params.delete("page");
      }

      const newUrl = `?${params.toString()}`;

      // Use startTransition for non-urgent updates
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // Prefetch the new data immediately
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: PromissoryNoteFilters = {
        search: newParams.get("search") || undefined,
        promissoryNoteDate_start:
          newParams.get("promissoryNoteDate_start") || undefined,
        promissoryNoteDate_end:
          newParams.get("promissoryNoteDate_end") || undefined,
        status: newParams.get("status") || undefined,
      };

      const newQueryKey = [
        "promissoryNotes",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getPromissoryNotes(
            newPage,
            newPageSize,
            newPageSize === 0,
            newFilters
          ),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllPromissoryNotes) return;
      navigate({ page });
    },
    [getAllPromissoryNotes, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllPromissoryNotes) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllPromissoryNotes, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllPromissoryNotes) return;
      navigate({ search });
    },
    [getAllPromissoryNotes, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<PromissoryNoteFilters>) => {
      if (getAllPromissoryNotes) return;
      navigate({ filters });
    },
    [getAllPromissoryNotes, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllPromissoryNotes) return;
    navigate({
      filters: defaultPromissoryNoteFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllPromissoryNotes, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("promissory_notes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "promissory_notes",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["promissoryNotes"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
        queryKey: ["promissoryNotes"],
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
        queryKey: ["promissoryNotes"],
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
        queryKey: ["promissoryNotes"],
      });
    },
  });

  return {
    promissoryNotes: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    filters: currentState.filters,
    isLoading: isLoading || isPending,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch: refetch,
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
