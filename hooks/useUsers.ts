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
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@/types";

interface UseUsersOptions {
  getAllUsers?: boolean;
  initialPageSize?: number;
}

export const useUsers = ({
  getAllUsers = false,
  initialPageSize = 10,
}: UseUsersOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shouldFetchAll = getAllUsers;

  const isShowAllMode = pageSize === 0;

  // Query for all Users
  const allUsersQuery = useQuery({
    queryKey: ["users", "allUsers"],
    queryFn: async () => {
      const result = await getUsers(0, 0, true);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Users
  const paginatedUsersQuery = useQuery({
    queryKey: ["users", "paginatedUsers", page, pageSize],
    queryFn: async () => {
      const result = await getUsers(page, pageSize, false);
      return result;
    },
    enabled: !shouldFetchAll || !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode ? allUsersQuery : paginatedUsersQuery;
  const users =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedUsersQuery.data &&
      page * pageSize < paginatedUsersQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["users", "paginatedUsers", page + 1, pageSize],
        queryFn: () => getUsers(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedUsersQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
  ]);

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

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
        role: data.role,
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
        role: data.role,
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
    users,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isFetching: activeQuery.isFetching,
    page,
    setPage,
    pageSize,
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
