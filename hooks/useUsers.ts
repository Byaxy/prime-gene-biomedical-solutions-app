import {
  addUser,
  editUser,
  getUsers,
  deleteUser,
  updatePassword,
} from "@/lib/actions/user.actions";
import { storage } from "@/lib/appwrite-client";
import {
  CreateUserFormValues,
  EditUserFormValues,
  UpdatePasswordFormValues,
} from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID } from "appwrite";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

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

  // Query for all Users
  const allUsersQuery = useQuery({
    queryKey: ["users", "allUsers"],
    queryFn: async () => {
      const result = await getUsers(0, 0, true);
      return result.documents;
    },
    enabled: getAllUsers,
  });

  // Query for paginated Users
  const paginatedUsersQuery = useQuery({
    queryKey: ["users", "paginatedUsers", page, pageSize],
    queryFn: async () => {
      const result = await getUsers(page, pageSize, false);
      return result;
    },
    enabled: !getAllUsers,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllUsers &&
      paginatedUsersQuery.data &&
      page * pageSize < paginatedUsersQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["users", "paginatedUsers", page + 1, pageSize],
        queryFn: () => getUsers(page + 1, pageSize, false),
      });
    }
  }, [page, pageSize, paginatedUsersQuery.data, queryClient, getAllUsers]);

  // get user by id
  const getUserById = async (userId: string) => {
    try {
      const users = allUsersQuery.data;
      const response = await users?.find((user: User) => user.$id === userId);
      return response;
    } catch (error) {
      console.error("Error getting user by id:", error);
      throw error;
    }
  };

  // Create user mutation
  const { mutate: addUserMutation, status: addUserStatus } = useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      let profileImageId = "";
      let profileImageUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          profileImageId = ID.unique();

          // Upload the file
          const upload = await storage.createFile(
            BUCKET_ID!,
            profileImageId,
            file
          );

          // Get the file view URL
          if (upload) {
            profileImageUrl = storage
              .getFileView(BUCKET_ID!, profileImageId)
              .toString();
          }
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
      toast.success("User createed successfully");
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
      let profileImageId = "";
      let profileImageUrl = "";

      if (prevImageId) {
        await storage.deleteFile(BUCKET_ID!, prevImageId);
      }

      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        profileImageId = ID.unique();

        // Upload the file
        const upload = await storage.createFile(
          BUCKET_ID!,
          profileImageId,
          file
        );

        // Get the file view URL
        if (upload) {
          profileImageUrl = storage
            .getFileView(BUCKET_ID!, profileImageId)
            .toString();
        }
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

  // update user password mutation
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
    mutationFn: (id: string) => deleteUser(id),
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
    getUserById,
    users: getAllUsers
      ? allUsersQuery.data
      : paginatedUsersQuery.data?.documents || [],
    totalItems: paginatedUsersQuery.data?.total || 0,
    isLoading: getAllUsers
      ? allUsersQuery.isLoading
      : paginatedUsersQuery.isLoading,
    error: getAllUsers ? allUsersQuery.error : paginatedUsersQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
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
