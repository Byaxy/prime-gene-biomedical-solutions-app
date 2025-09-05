import {
  addBrand,
  deleteBrand,
  editBrand,
  getBrands,
  softDeleteBrand,
} from "@/lib/actions/brand.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BrandFormValues } from "@/lib/validation";
import { Brand } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

export interface UseBrandsOptions {
  getAllBrands?: boolean;
  initialData?: { documents: Brand[]; total: number };
}

export interface BrandFilters {
  search?: string;
}

export const defaultBrandFilters: BrandFilters = {
  search: "",
};

export const useBrands = ({
  getAllBrands = false,
  initialData,
}: UseBrandsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllBrands) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: BrandFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllBrands, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["brands", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getBrands(page, pageSize, getAllBrands || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllBrands ? 60000 : 30000,
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
        filters: Partial<BrandFilters>;
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
        Object.keys(defaultBrandFilters).forEach((key) => params.delete(key));

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
      const newFilters: BrandFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "categories",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getBrands(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllBrands) return;
      navigate({ page });
    },
    [getAllBrands, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllBrands) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllBrands, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllBrands) return;
      navigate({ search });
    },
    [getAllBrands, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<BrandFilters>) => {
      if (getAllBrands) return;
      navigate({ filters });
    },
    [getAllBrands, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllBrands) return;
    navigate({
      filters: defaultBrandFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllBrands, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("brands_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brands",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["brands"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
    brands: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    isLoading: isLoading || isPending,
    refetch: refetch,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    filters: currentState.filters,
    setFilters,
    clearFilters,
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
