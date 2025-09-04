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
  reactivateMultipleProducts,
  reactivateProduct,
  softDeleteMultipleProducts,
  softDeleteProduct,
} from "@/lib/actions/product.actions";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProductWithRelations } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

interface UseProductsOptions {
  getAllProducts?: boolean;
  initialData?: { documents: ProductWithRelations[]; total: number };
  enableRealtime?: boolean;
}

export interface ProductFilters {
  search?: string;
  isActive?: "true" | "false" | "all";
  categoryId?: string;
  brandId?: string;
  typeId?: string;
  unitId?: string;
  costPrice_min?: number;
  costPrice_max?: number;
  sellingPrice_min?: number;
  sellingPrice_max?: number;
  quantity_min?: number;
  quantity_max?: number;
}

export const defaultProductFilters: ProductFilters = {
  isActive: undefined,
  categoryId: undefined,
  brandId: undefined,
  typeId: undefined,
  unitId: undefined,
  costPrice_min: undefined,
  costPrice_max: undefined,
  sellingPrice_min: undefined,
  sellingPrice_max: undefined,
  quantity_min: undefined,
  quantity_max: undefined,
};

export const useProducts = ({
  getAllProducts = false,
  initialData,
  enableRealtime = true,
}: UseProductsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllProducts) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: {
          isActive: "all",
        } as ProductFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: ProductFilters = {
      search: search || undefined,
      isActive:
        (searchParams.get("isActive") as ProductFilters["isActive"]) ||
        undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      brandId: searchParams.get("brandId") || undefined,
      typeId: searchParams.get("typeId") || undefined,
      unitId: searchParams.get("unitId") || undefined,
      costPrice_min: searchParams.get("costPrice_min")
        ? Number(searchParams.get("costPrice_min"))
        : undefined,
      costPrice_max: searchParams.get("costPrice_max")
        ? Number(searchParams.get("costPrice_max"))
        : undefined,
      sellingPrice_min: searchParams.get("sellingPrice_min")
        ? Number(searchParams.get("sellingPrice_min"))
        : undefined,
      sellingPrice_max: searchParams.get("sellingPrice_max")
        ? Number(searchParams.get("sellingPrice_max"))
        : undefined,
      quantity_min: searchParams.get("quantity_min")
        ? Number(searchParams.get("quantity_min"))
        : undefined,
      quantity_max: searchParams.get("quantity_max")
        ? Number(searchParams.get("quantity_max"))
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllProducts, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["products", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getProducts(
        page,
        pageSize,
        getAllProducts || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllProducts ? 60000 : 30000,
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
        filters: Partial<ProductFilters>;
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
        Object.keys(defaultProductFilters).forEach((key) => params.delete(key));

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
      const newFilters: ProductFilters = {
        search: newParams.get("search") || undefined,
        isActive:
          (newParams.get("isActive") as ProductFilters["isActive"]) ||
          undefined,
        categoryId: newParams.get("categoryId") || undefined,
        brandId: newParams.get("brandId") || undefined,
        typeId: newParams.get("typeId") || undefined,
        unitId: newParams.get("unitId") || undefined,
        costPrice_min: newParams.get("costPrice_min")
          ? Number(newParams.get("costPrice_min"))
          : undefined,
        costPrice_max: newParams.get("costPrice_max")
          ? Number(newParams.get("costPrice_max"))
          : undefined,
        sellingPrice_min: newParams.get("sellingPrice_min")
          ? Number(newParams.get("sellingPrice_min"))
          : undefined,
        sellingPrice_max: newParams.get("sellingPrice_max")
          ? Number(newParams.get("sellingPrice_max"))
          : undefined,
        quantity_min: newParams.get("quantity_min")
          ? Number(newParams.get("quantity_min"))
          : undefined,
        quantity_max: newParams.get("quantity_max")
          ? Number(newParams.get("quantity_max"))
          : undefined,
      };

      const newQueryKey = [
        "products",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getProducts(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllProducts) return;
      navigate({ page });
    },
    [getAllProducts, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllProducts) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllProducts, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllProducts) return;
      navigate({ search });
    },
    [getAllProducts, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<ProductFilters>) => {
      if (getAllProducts) return;
      navigate({ filters });
    },
    [getAllProducts, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllProducts) return;
    navigate({
      filters: defaultProductFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllProducts, navigate]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealtime) return;

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, queryClient]);

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
      console.error("Error deactivating products:", error);
      toast.error("Failed to deactivate selected products");
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

  const {
    mutate: reactivateMultipleProductsMutation,
    status: reactivateMultipleProductsStatus,
  } = useMutation({
    mutationFn: async (productIds: string[]) => {
      return await reactivateMultipleProducts(productIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Selected products reactivated successfully");
    },
    onError: (error) => {
      console.error("Error reactivating products:", error);
      toast.error("Failed to reactivate selected products");
    },
  });

  return {
    products: data?.documents || [],
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
    reactivateMultipleProducts: reactivateMultipleProductsMutation,
    isReactivatingMultipleProducts:
      reactivateMultipleProductsStatus === "pending",
  };
};
