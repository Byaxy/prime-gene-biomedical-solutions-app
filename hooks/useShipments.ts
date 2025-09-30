/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addShipment,
  deleteShipment,
  editShipment,
  getShipments,
  softDeleteShipment,
} from "@/lib/actions/shipment.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ShipmentFormValues } from "@/lib/validation";
import { Attachment, ShipmentWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseShipmentsOptions {
  getAllShipments?: boolean;
  initialData?: { documents: ShipmentWithRelations[]; total: number };
}

export interface ShipmentFilters {
  search?: string;
  shippingDate_start?: string;
  shippingDate_end?: string;
  shippingMode?: string;
  status?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  carrierType?: string;
  shipperType?: string;
}

export const defaultShipmentFilters: ShipmentFilters = {
  search: undefined,
  shippingDate_start: undefined,
  shippingDate_end: undefined,
  shippingMode: undefined,
  status: undefined,
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  carrierType: undefined,
  shipperType: undefined,
};

export const useShipments = ({
  getAllShipments = false,
  initialData,
}: UseShipmentsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllShipments) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: ShipmentFilters = {
      search: search || undefined,
      totalAmount_min: searchParams.get("totalAmount_min")
        ? Number(searchParams.get("totalAmount_min"))
        : undefined,
      totalAmount_max: searchParams.get("totalAmount_max")
        ? Number(searchParams.get("totalAmount_max"))
        : undefined,
      status: searchParams.get("status") || undefined,
      shippingDate_start: searchParams.get("shippingDate_start") || undefined,
      shippingDate_end: searchParams.get("shippingDate_end") || undefined,
      shippingMode: searchParams.get("shippingMode") || undefined,
      carrierType: searchParams.get("carrierType") || undefined,
      shipperType: searchParams.get("shipperType") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllShipments, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["shipments", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getShipments(
        page,
        pageSize,
        getAllShipments || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllShipments ? 60000 : 30000,
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
        filters: Partial<ShipmentFilters>;
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
        Object.keys(defaultShipmentFilters).forEach((key) =>
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
      const newFilters: ShipmentFilters = {
        search: newParams.get("search") || undefined,
        totalAmount_min: newParams.get("totalAmount_min")
          ? Number(newParams.get("totalAmount_min"))
          : undefined,
        totalAmount_max: newParams.get("totalAmount_max")
          ? Number(newParams.get("totalAmount_max"))
          : undefined,
        status: newParams.get("status") || undefined,
        shippingDate_start: newParams.get("shippingDate_start") || undefined,
        shippingDate_end: newParams.get("shippingDate_end") || undefined,
        shippingMode: newParams.get("shippingMode") || undefined,
        carrierType: newParams.get("carrierType") || undefined,
        shipperType: newParams.get("shipperType") || undefined,
      };

      const newQueryKey = [
        "shipments",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getShipments(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllShipments) return;
      navigate({ page });
    },
    [getAllShipments, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllShipments) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllShipments, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllShipments) return;
      navigate({ search });
    },
    [getAllShipments, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<ShipmentFilters>) => {
      if (getAllShipments) return;
      navigate({ filters });
    },
    [getAllShipments, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllShipments) return;
    navigate({
      filters: defaultShipmentFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllShipments, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("shipments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shipments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: addShipmentMutation, status: addShipmentStatus } =
    useMutation({
      mutationFn: async (data: ShipmentFormValues) => {
        const supabase = createSupabaseBrowserClient();
        const attachments: Attachment[] = [];

        if (data.attachments && data.attachments.length > 0) {
          try {
            // Upload all files
            await Promise.all(
              data.attachments.map(async (file: any) => {
                const fileId = `${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                  .from("images")
                  .upload(fileId, file);

                if (uploadError) throw uploadError;

                // Get the file URL
                const { data: urlData } = supabase.storage
                  .from("images")
                  .getPublicUrl(fileId);

                attachments.push({
                  id: fileId,
                  url: urlData.publicUrl,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                });
              })
            );
          } catch (error) {
            console.error("Error uploading files:", error);
            throw new Error("Failed to upload attachments");
          }
        }

        const dataWithAttachment = {
          ...data,
          attachments,
        };
        return addShipment(dataWithAttachment);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["shipments", "paginatedShipments"],
        });
      },
      onError: (error) => {
        console.error("Error creating shipment:", error);
      },
    });

  const { mutate: editShipmentMutation, status: editShipmentStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        prevAttachmentIds,
      }: {
        id: string;
        data: ShipmentFormValues;
        prevAttachmentIds?: string[];
      }) => {
        const supabase = createSupabaseBrowserClient();
        const attachments: Attachment[] = [];

        // Delete previous attachments if needed
        if (prevAttachmentIds && prevAttachmentIds.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("images")
            .remove(prevAttachmentIds);

          if (deleteError) {
            console.warn("Failed to delete previous attachments:", deleteError);
          }
        }

        // Upload new attachments
        if (data.attachments && data.attachments.length > 0) {
          try {
            await Promise.all(
              data.attachments.map(async (file: any) => {
                const fileId = `${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                  .from("images")
                  .upload(fileId, file);

                if (uploadError) throw uploadError;

                // Get the file URL
                const { data: urlData } = supabase.storage
                  .from("images")
                  .getPublicUrl(fileId);

                attachments.push({
                  id: fileId,
                  url: urlData.publicUrl,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                });
              })
            );
          } catch (error) {
            console.error("Error uploading files:", error);
            throw new Error("Failed to upload attachments");
          }
        }

        const dataWithAttachments = {
          ...data,
          attachments,
        };
        return editShipment(id, dataWithAttachments);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["shipments"],
        });
      },
      onError: (error) => {
        console.error("Error updating shipment:", error);
      },
    });

  const {
    mutate: softDeleteShipmentMutation,
    status: softDeleteShipmentStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shipments"],
      });
    },
    onError: (error) => {
      console.error("Error soft deleting shipment:", error);
    },
  });

  const { mutate: deleteShipmentMutation, status: deleteShipmentStatus } =
    useMutation({
      mutationFn: (id: string) => deleteShipment(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["shipments"],
        });
      },
      onError: (error) => {
        console.error("Error deleting shipment:", error);
        toast.error("Failed to delete shipment");
      },
    });

  return {
    shipments: data?.documents || [],
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
    addShipment: addShipmentMutation,
    isCreatingShipment: addShipmentStatus === "pending",
    editShipment: editShipmentMutation,
    isEditingShipment: editShipmentStatus === "pending",
    softDeleteShipment: softDeleteShipmentMutation,
    isSoftDeletingShipment: softDeleteShipmentStatus === "pending",
    deleteShipment: deleteShipmentMutation,
    isDeletingShipment: deleteShipmentStatus === "pending",
  };
};
