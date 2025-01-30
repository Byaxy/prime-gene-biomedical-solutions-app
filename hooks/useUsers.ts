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
import toast from "react-hot-toast";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

export const useUsers = () => {
  const queryClient = useQueryClient();

  // Get all users
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const result = await getUsers();

      if (!result) {
        throw new Error("Failed to fetch users");
      }
      return result;
    },
  });

  // get user by id
  const getUserById = async (userId: string) => {
    try {
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
    users,
    isLoading,
    error,
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
