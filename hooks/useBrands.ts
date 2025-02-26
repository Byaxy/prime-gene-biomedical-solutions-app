import {
  addBrand,
  deleteBrand,
  editBrand,
  getBrands,
  softDeleteBrand,
} from "@/lib/actions/brand.actions";
import { storage } from "@/lib/appwrite-client";
import { BrandFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID } from "appwrite";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

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

  // Query for all Brands
  const allBrandsQuery = useQuery({
    queryKey: ["brands", "allBrands"],
    queryFn: async () => {
      const result = await getBrands(0, 0, true);
      return result.documents;
    },
    enabled: getAllBrands,
  });

  // Query for paginated Brands
  const paginatedBrandsQuery = useQuery({
    queryKey: ["brands", "paginatedBrands", page, pageSize],
    queryFn: async () => {
      const result = await getBrands(page, pageSize, false);
      return result;
    },
    enabled: !getAllBrands,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllBrands &&
      paginatedBrandsQuery.data &&
      page * pageSize < paginatedBrandsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["brands", "paginatedBrands", page + 1, pageSize],
        queryFn: () => getBrands(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedBrandsQuery.data, queryClient, getAllBrands]);

  // Add Brand mutation
  const { mutate: addBrandMutation, status: addBrandStatus } = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      let imageId = "";
      let imageUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          imageId = ID.unique();

          // Upload the file
          const upload = await storage.createFile(BUCKET_ID!, imageId, file);

          // Get the file view URL
          if (upload) {
            imageUrl = storage.getFileView(BUCKET_ID!, imageId).toString();
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error("Failed to upload brand image");
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
      let imageId = "";
      let imageUrl = "";

      if (prevImageId && data.image && data.image.length > 0) {
        try {
          storage.deleteFile(BUCKET_ID!, prevImageId);
        } catch (error) {
          console.warn("Error deleting previous image:", error);
        }
      }

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          imageId = ID.unique();

          // Upload the file
          const upload = await storage.createFile(BUCKET_ID!, imageId, file);

          // Get the file view URL
          if (upload) {
            imageUrl = storage.getFileView(BUCKET_ID!, imageId).toString();
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error("Failed to upload brand image");
        }
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
    brands: getAllBrands
      ? allBrandsQuery.data
      : paginatedBrandsQuery.data?.documents || [],
    totalItems: paginatedBrandsQuery.data?.total || 0,
    isLoading: getAllBrands
      ? allBrandsQuery.isLoading
      : paginatedBrandsQuery.isLoading,
    error: getAllBrands ? allBrandsQuery.error : paginatedBrandsQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addBrand: addBrandMutation,
    editBrand: editBrandMutation,
    softDeleteBrand: softDeleteBrandMutation,
    deleteBrand: deleteBrandMutation,
    isAddingBrand: addBrandStatus === "pending",
    isEditingBrand: editBrandStatus === "pending",
    isDeletingBrand: deleteBrandStatus === "pending",
    isSoftDeletingBrand: softDeleteBrandStatus === "pending",
  };
};
