"use client";

import {
  addUser,
  editUser,
  getUsers,
  deleteUser,
  updatePassword,
} from "@/lib/actions/user.actions";
import {
  CreateUserFormValues,
  EditUserFormValues,
  UpdatePasswordFormValues,
} from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

interface UseUsersOptions {
  getAllUsers?: boolean;
  initialData?: { documents: User[]; total: number };
}

export interface UserFilters {
  search?: string;
}

export const defaultUserFilters: UserFilters = {
  search: undefined,
};

export const useUsers = ({
  getAllUsers = false,
  initialData,
}: UseUsersOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllUsers) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: UserFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllUsers, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["users", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getUsers(page, pageSize, getAllUsers || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllUsers ? 60000 : 30000,
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
        filters: Partial<UserFilters>;
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
        Object.keys(defaultUserFilters).forEach((key) => params.delete(key));

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
      const newFilters: UserFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "users",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getUsers(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllUsers) return;
      navigate({ page });
    },
    [getAllUsers, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllUsers) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllUsers, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllUsers) return;
      navigate({ search });
    },
    [getAllUsers, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<UserFilters>) => {
      if (getAllUsers) return;
      navigate({ filters });
    },
    [getAllUsers, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllUsers) return;
    navigate({
      filters: defaultUserFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllUsers, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("users_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create user mutation
  const { mutate: addUserMutation, status: addUserStatus } = useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      const supabase = createSupabaseBrowserClient();
      let profileImageId = "";
      let profileImageUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          profileImageId = `${Date.now()}-${file.name}`; // Generate a unique file name

          // Upload the file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("images")
            .upload(profileImageId, file);

          if (uploadError) throw uploadError;

          // Get the file URL
          const { data: urlData } = supabase.storage
            .from("images")
            .getPublicUrl(profileImageId);

          profileImageUrl = urlData.publicUrl;
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error("Failed to upload profile image");
        }
      }

      // Prepare user data with file information
      const userData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        roleId: data.roleId,
        password: data.password,
        confirmPassword: data.confirmPassword,
        profileImageId,
        profileImageUrl,
      };

      return addUser(userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast.error(error.message);
    },
  });

  // Edit user mutation
  const { mutate: editUserMutation, status: editUserStatus } = useMutation({
    mutationFn: async ({
      id,
      data,
      prevImageId,
    }: {
      id: string;
      data: EditUserFormValues;
      prevImageId?: string;
    }) => {
      const supabase = createSupabaseBrowserClient();
      let profileImageId = "";
      let profileImageUrl = "";

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
        profileImageId = `${Date.now()}-${file.name}`; // Generate a unique file name

        // Upload the file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(profileImageId, file);

        if (uploadError) throw uploadError;

        // Get the file URL
        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(profileImageId);

        profileImageUrl = urlData.publicUrl;
      }

      const userData = {
        name: data.name,
        phone: data.phone,
        roleId: data.roleId,
        profileImageId,
        profileImageUrl,
      };

      return editUser(userData, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User edited successfully");
    },
    onError: (error) => {
      console.error("Error editing user:", error);
      toast.error("Failed to edit user");
    },
  });

  // Update user password mutation
  const { mutate: updatePasswordMutation, status: updatePasswordStatus } =
    useMutation({
      mutationFn: async ({
        userId,
        data,
      }: {
        userId: string;
        data: UpdatePasswordFormValues;
      }) => {
        return updatePassword(userId, data);
      },
      onSuccess: () => {
        toast.success("Password updated successfully");
      },
      onError: (error) => {
        console.error("Error updating password:", error);
        toast.error("Failed to update password");
      },
    });

  // Delete user mutation
  const { mutate: deleteUserMutation, status: deleteUserStatus } = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createSupabaseBrowserClient();

      // Delete the user's profile image from Supabase Storage if it exists
      const user = await getUsers(0, 0, true).then((res) =>
        res.documents.find((u: User) => u.id === id)
      );

      if (user?.profileImageId) {
        const { error: deleteError } = await supabase.storage
          .from("images")
          .remove([user.profileImageId]);

        if (deleteError)
          console.warn("Failed to delete profile image:", deleteError);
      }

      // Delete the user from the database
      return deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    },
  });

  return {
    users: data?.documents || [],
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
    addUser: addUserMutation,
    isCreatingUser: addUserStatus === "pending",
    editUser: editUserMutation,
    isEditingUser: editUserStatus === "pending",
    deleteUser: deleteUserMutation,
    isDeletingUser: deleteUserStatus === "pending",
    updatePassword: updatePasswordMutation,
    isUpdatingPassword: updatePasswordStatus === "pending",
  };
};
