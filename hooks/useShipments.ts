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
import { Attachment, ShipmentStatus, ShippingMode } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseShipmentsOptions {
  getAllShipments?: boolean;
  initialPageSize?: number;
}

export interface ShipmentFilters {
  trackingNumber?: string;
  shippingDate_start?: Date;
  shippingDate_end?: Date;
  carrierName?: string;
  shippingMode?: ShippingMode;
  status?: ShipmentStatus;
}

export const defaultShipmentFilters: ShipmentFilters = {
  trackingNumber: undefined,
  shippingDate_start: undefined,
  shippingDate_end: undefined,
  carrierName: undefined,
  shippingMode: undefined,
  status: undefined,
};

export const useShipments = ({
  getAllShipments = false,
  initialPageSize = 10,
}: UseShipmentsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<ShipmentFilters>(
    defaultShipmentFilters
  );

  const shouldFetchAll = getAllShipments;

  const isShowAllMode = pageSize === 0;

  // Query for all Shipments
  const allShipmentsQuery = useQuery({
    queryKey: ["shipments", filters],
    queryFn: async () => {
      const result = await getShipments(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Shipments
  const paginatedShipmentsQuery = useQuery({
    queryKey: ["shipments", "paginatedShipments", page, pageSize, filters],
    queryFn: async () => {
      const result = await getShipments(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allShipmentsQuery
      : paginatedShipmentsQuery;
  const shipments = activeQuery.data?.documents || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedShipmentsQuery.data &&
      page * pageSize < paginatedShipmentsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "shipments",
          "paginatedShipments",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getShipments(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedShipmentsQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: ShipmentFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

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
          queryKey: ["shipments", "paginatedShipments"],
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
        queryKey: ["shipments", "paginatedShipments"],
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
          queryKey: ["shipments", "paginatedShipments"],
        });
      },
      onError: (error) => {
        console.error("Error deleting shipment:", error);
        toast.error("Failed to delete shipment");
      },
    });

  return {
    shipments,
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
    defaultFilterValues: defaultShipmentFilters,
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
