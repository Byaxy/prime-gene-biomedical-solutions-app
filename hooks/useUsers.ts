import {
  addUser,
  editUser,
  getUsers,
  softDeleteUser,
} from "@/lib/actions/user.actions";
import { storage } from "@/lib/appwrite-client";
import { CreateUserFormValues, EditUserFormValues } from "@/lib/validation";
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

      console.log(userData);

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

  // Delete user mutation
  const { mutate: softDeleteUserMutation, status: softDeleteUserStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteUser(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        toast.success("User deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      },
    });

  // permanently delete user mutation
  const { mutate: deleteUserMutation, status: deleteUserStatus } = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User permanently deleted successfully");
    },
    onError: (error) => {
      console.error("Error permanently deleting user:", error);
      toast.error("Failed to permanently delete user");
    },
  });

  return {
    users,
    isLoading,
    error,
    addUser: addUserMutation,
    isCreatingUser: addUserStatus === "pending",
    editUser: editUserMutation,
    isEditingUser: editUserStatus === "pending",
    softDeleteUser: softDeleteUserMutation,
    isSoftDeletingUser: softDeleteUserStatus === "pending",
    permanentlyDeleteUser: deleteUserMutation,
    isPermanentlyDeletingUser: deleteUserStatus === "pending",
  };
};
