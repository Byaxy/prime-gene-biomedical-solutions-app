"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BulkProductValues, ProductFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import {
  addProduct,
  bulkAddProducts,
  deleteMultipleProducts,
  deleteProduct,
  editProduct,
  getProducts,
  reactivateProduct,
  softDeleteMultipleProducts,
  softDeleteProduct,
} from "@/lib/actions/product.actions";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface UseProductsOptions {
  getAllProducts?: boolean;
  initialPageSize?: number;
}

export interface ProductFilters {
  costPrice_min?: number;
  costPrice_max?: number;
  sellingPrice_min?: number;
  sellingPrice_max?: number;
  quantity_min?: number;
  quantity_max?: number;
  isActive?: "true" | "false" | "all";
  categoryId?: string;
  typeId?: string;
  brandId?: string;
  unitId?: string;
}

export const defaultProductFilters: ProductFilters = {
  costPrice_min: undefined,
  costPrice_max: undefined,
  sellingPrice_min: undefined,
  sellingPrice_max: undefined,
  quantity_min: undefined,
  quantity_max: undefined,
  isActive: "true",
  categoryId: undefined,
  typeId: undefined,
  brandId: undefined,
  unitId: undefined,
};

export const useProducts = ({
  getAllProducts = false,
  initialPageSize = 10,
}: UseProductsOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<ProductFilters>(defaultProductFilters);

  const shouldFetchAll = getAllProducts;

  const isShowAllMode = pageSize === 0;

  // Query for all Products
  const allProductsQuery = useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const result = await getProducts(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Products
  const paginatedProductsQuery = useQuery({
    queryKey: ["products", "paginatedProducts", page, pageSize, filters],
    queryFn: async () => {
      const result = await getProducts(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allProductsQuery : paginatedProductsQuery;
  const products =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedProductsQuery.data &&
      page * pageSize < paginatedProductsQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "products",
          "paginatedProducts",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getProducts(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedProductsQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add product mutation
  const { mutate: addProductMutation, status: addProductStatus } = useMutation({
    mutationFn: async (data: ProductFormValues) => {
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

      const productData = {
        productID: data.productID,
        name: data.name,
        alertQuantity: data.alertQuantity,
        maxAlertQuantity: data.maxAlertQuantity,
        quantity: data.quantity,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        categoryId: data.categoryId,
        brandId: data.brandId,
        typeId: data.typeId,
        unitId: data.unitId,
        description: data.description,
        imageId,
        imageUrl,
      };

      return addProduct(productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Add Products in bulk
  const { mutate: bulkAddProductsMutation, status: bulkAddProductsStatus } =
    useMutation({
      mutationFn: async (products: BulkProductValues) => {
        return bulkAddProducts(products);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Products imported successfully");
      },
      onError: (error) => {
        console.error("Error bulk adding products:", error);
        toast.error("Failed to upload products");
      },
    });

  // Edit product mutation
  const { mutate: editProductMutation, status: editProductStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        prevImageId,
      }: {
        id: string;
        data: ProductFormValues;
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

        const productData = {
          productID: data.productID,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          name: data.name,
          alertQuantity: data.alertQuantity,
          maxAlertQuantity: data.maxAlertQuantity,
          quantity: data.quantity,
          categoryId: data.categoryId,
          brandId: data.brandId,
          typeId: data.typeId,
          unitId: data.unitId,
          description: data.description,
          imageId,
          imageUrl,
        };

        return editProduct(productData, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      },
    });

  // Soft Delete product mutation
  const { mutate: softDeleteProductMutation, status: softDeleteProductStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteProduct(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product deactivated successfully");
      },
      onError: (error) => {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      },
    });

  // Permanently Delete product mutation
  const { mutate: deleteProductMutation, status: deleteProductStatus } =
    useMutation({
      mutationFn: (id: string) => deleteProduct(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      },
    });

  // Delete multiple products mutation
  // Permanently Delete multiple products mutation
  const {
    mutate: deleteMultipleProductsMutation,
    status: deleteMultipleProductsStatus,
  } = useMutation({
    mutationFn: async (productIds: string[]) => {
      return await deleteMultipleProducts(productIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Selected products deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting products:", error);
      toast.error("Failed to delete selected products");
    },
  });

  // Soft Delete multiple products mutation
  const {
    mutate: softDeleteMultipleProductsMutation,
    status: softDeleteMultipleProductsStatus,
  } = useMutation({
    mutationFn: async (productIds: string[]) => {
      return await softDeleteMultipleProducts(productIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Selected products deactivated successfully");
    },
    onError: (error) => {
      console.error("Error deleting products:", error);
      toast.error("Failed to delete selected products");
    },
  });

  // reactivate product mutation
  const { mutate: reactivateProductMutation, status: reactivateProductStatus } =
    useMutation({
      mutationFn: (id: string) => reactivateProduct(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product reactivated successfully");
      },
      onError: (error) => {
        console.error("Error reactivating product:", error);
        toast.error("Failed to reactivate product");
      },
    });

  return {
    products,
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
    defaultFilterValues: defaultProductFilters,
    addProduct: addProductMutation,
    bulkAddProducts: bulkAddProductsMutation,
    editProduct: editProductMutation,
    softDeleteProduct: softDeleteProductMutation,
    deleteProduct: deleteProductMutation,
    deleteMultipleProducts: deleteMultipleProductsMutation,
    softDeleteMultipleProducts: softDeleteMultipleProductsMutation,
    isAddingProduct: addProductStatus === "pending",
    isBulkAddingProducts: bulkAddProductsStatus === "pending",
    isEditingProduct: editProductStatus === "pending",
    isDeletingProduct: deleteProductStatus === "pending",
    isSoftDeletingProduct: softDeleteProductStatus === "pending",
    isDeletingMultipleProducts: deleteMultipleProductsStatus === "pending",
    isSoftDeletingMultipleProducts:
      softDeleteMultipleProductsStatus === "pending",
    reactivateProduct: reactivateProductMutation,
    isReactivatingProduct: reactivateProductStatus === "pending",
  };
};
