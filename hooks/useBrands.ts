import {
  addBrand,
  deleteBrand,
  editBrand,
  getBrands,
  softDeleteBrand,
} from "@/lib/actions/brand.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BrandFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export interface UseBrandsOptions {
  getAllBrands?: boolean;
  initialPageSize?: number;
}

export const useBrands = ({
  getAllBrands = false,
  initialPageSize = 10,
}: UseBrandsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shouldFetchAll = getAllBrands;

  const isShowAllMode = pageSize === 0;

  // Query for all Brands
  const allBrandsQuery = useQuery({
    queryKey: ["brands", "allBrands"],
    queryFn: async () => {
      const result = await getBrands(0, 0, true);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Brands
  const paginatedBrandsQuery = useQuery({
    queryKey: ["brands", "paginatedBrands", page, pageSize],
    queryFn: async () => {
      const result = await getBrands(page, pageSize, false);
      return result;
    },
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allBrandsQuery : paginatedBrandsQuery;
  const brands = activeQuery.data?.documents || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedBrandsQuery.data &&
      page * pageSize < paginatedBrandsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["brands", "paginatedBrands", page + 1, pageSize],
        queryFn: () => getBrands(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedBrandsQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
  ]);

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add Brand mutation
  const { mutate: addBrandMutation, status: addBrandStatus } = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      const supabase = createSupabaseBrowserClient();
      let imageId = "";
      let imageUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          imageId = `${Date.now()}-${file.name}`; // Generate a unique file name

          // Upload the file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("images")
            .upload(imageId, file);

          if (uploadError) throw uploadError;

          // Get the file URL
          const { data: urlData } = supabase.storage
            .from("images")
            .getPublicUrl(imageId);

          imageUrl = urlData.publicUrl;
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error("Failed to upload image");
        }
      }

      const brandData = {
        name: data.name,
        description: data.description,
        imageId,
        imageUrl,
      };

      return addBrand(brandData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand added successfully");
    },
    onError: (error) => {
      console.error("Error adding brand:", error);
      toast.error("Failed to add brand");
    },
  });

  // Edit brand mutation
  const { mutate: editBrandMutation, status: editBrandStatus } = useMutation({
    mutationFn: async ({
      id,
      data,
      prevImageId,
    }: {
      id: string;
      data: BrandFormValues;
      prevImageId?: string;
    }) => {
      const supabase = createSupabaseBrowserClient();
      let imageId = "";
      let imageUrl = "";

      // Delete the previous image if it exists and new image is provided
      if (prevImageId && data?.image && data?.image.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("images")
          .remove([prevImageId]);

        if (deleteError)
          console.warn("Failed to delete previous image:", deleteError);
      }

      // Upload the new image if provided
      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        imageId = `${Date.now()}-${file.name}`; // Generate a unique file name

        // Upload the file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(imageId, file);

        if (uploadError) throw uploadError;

        // Get the file URL
        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(imageId);

        imageUrl = urlData.publicUrl;
      }

      const brandData = {
        name: data.name,
        description: data.description,
        imageId,
        imageUrl,
      };

      return editBrand(brandData, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
    },
    onError: (error) => {
      console.error("Error updating brand:", error);
      toast.error("Failed to update brand");
    },
  });

  // Soft Delete brand mutation
  const { mutate: softDeleteBrandMutation, status: softDeleteBrandStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteBrand(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["brands"] });
        toast.success("Brand deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting brand:", error);
        toast.error("Failed to delete brand");
      },
    });

  // Permanently Delete brand mutation
  const { mutate: deleteBrandMutation, status: deleteBrandStatus } =
    useMutation({
      mutationFn: (id: string) => deleteBrand(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["brands"] });
        toast.success("Brand deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting brand:", error);
        toast.error("Failed to delete brand");
      },
    });

  return {
    brands,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    addBrand: addBrandMutation,
    editBrand: editBrandMutation,
    softDeleteBrand: softDeleteBrandMutation,
    deleteBrand: deleteBrandMutation,
    isAddingBrand: addBrandStatus === "pending",
    isEditingBrand: editBrandStatus === "pending",
    isDeletingBrand: deleteBrandStatus === "pending",
    isSoftDeletingBrand: softDeleteBrandStatus === "pending",
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
  };
};
