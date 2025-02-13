"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  users,
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_USERS_COLLECTION_ID,
} from "../appwrite-server";
import { account } from "../appwrite-client";
import {
  CreateUserFormValues,
  EditUserFormValues,
  UpdatePasswordFormValues,
} from "../validation";

interface UserDataWithImage extends Omit<CreateUserFormValues, "image"> {
  profileImageId: string;
  profileImageUrl: string;
}

// create user
export const addUser = async (user: UserDataWithImage) => {
  try {
    // Create user in Appwrite Authentication
    const newUser = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    // store user image in Appwrite Storage
    if (newUser) {
      const dbUser = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImageId: user.profileImageId || "", // Store as separate fields
        profileImageUrl: user.profileImageUrl || "",
      };

      // Create user document in database
      const newDbUser = await databases.createDocument(
        DATABASE_ID!,
        NEXT_PUBLIC_USERS_COLLECTION_ID!,
        newUser.$id,
        dbUser
      );

      revalidatePath("/users");
      return parseStringify(newDbUser);
    }
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Edite user
interface EditUserWithImage extends Omit<EditUserFormValues, "image"> {
  profileImageId: string;
  profileImageUrl: string;
}
export const editUser = async (user: EditUserWithImage, userId: string) => {
  try {
    let response;

    // First get the current user data to compare
    const currentUser = await databases.getDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_USERS_COLLECTION_ID!,
      userId
    );

    // Update name only if changed
    if (currentUser.name !== user.name) {
      try {
        await users.updateName(userId, user.name);
      } catch (error) {
        console.error("Error updating user name:", error);
        throw new Error("Failed to update user name");
      }
    }

    // Update phone only if changed
    if (currentUser.phone !== user.phone) {
      try {
        await users.updatePhone(userId, user.phone);
      } catch (error) {
        console.error("Error updating user phone:", error);
        throw new Error("Failed to update user phone");
      }
    }

    // Update database document only if there are changes
    const hasChanges =
      currentUser.name !== user.name ||
      currentUser.phone !== user.phone ||
      currentUser.role !== user.role ||
      (user.profileImageId && user.profileImageUrl); // Always update if new image

    if (hasChanges) {
      try {
        if (user.profileImageId && user.profileImageUrl) {
          response = await databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_USERS_COLLECTION_ID!,
            userId,
            {
              name: user.name,
              phone: user.phone,
              role: user.role,
              profileImageId: user.profileImageId,
              profileImageUrl: user.profileImageUrl,
            }
          );
        } else {
          response = await databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_USERS_COLLECTION_ID!,
            userId,
            {
              name: user.name,
              phone: user.phone,
              role: user.role,
            }
          );
        }
      } catch (error) {
        console.error("Error updating user document:", error);
        throw new Error("Failed to update user information in database");
      }
    } else {
      // If no changes, return the current user data
      response = currentUser;
    }

    revalidatePath("/users");
    revalidatePath("/settings");
    return parseStringify(response);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// get users
export const getUsers = async (
  page: number = 0,
  limit: number = 10,
  getAllUsers: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllUsers) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));
    }

    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_USERS_COLLECTION_ID!,
      queries
    );

    return {
      documents: parseStringify(response.documents),
      total: response.total,
    };
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// delete user
export const deleteUser = async (userId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_USERS_COLLECTION_ID!,
      userId
    );

    // delete user from Appwrite Authentication
    try {
      await users.delete(userId);
    } catch (error) {
      console.warn(
        "Warning: Could not delete user from authentication:",
        error
      );
    }

    revalidatePath("/users");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting user:", error);
    throw error;
  }
};

// updated user password

export const updatePassword = async (
  userId: string,
  data: UpdatePasswordFormValues
) => {
  try {
    if (!data.newPassword || !data.confirmPassword) {
      throw new Error("Please enter a new password");
    }
    if (data.newPassword.trim() !== data.confirmPassword.trim()) {
      throw new Error("Passwords do not match");
    }

    await users.updatePassword(userId, data.newPassword);
    return true;
  } catch (error) {
    console.error("Error updating user password:", error);
    throw error;
  }
};
