"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  CreateUserFormValues,
  EditUserFormValues,
  UpdatePasswordFormValues,
} from "../validation";
import { createSupabaseServerClient } from "../supabase/server";
import { usersTable } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { desc, eq } from "drizzle-orm";
import supabaseAdmin from "../supabase/admin";

interface UserDataWithImage extends Omit<CreateUserFormValues, "image"> {
  profileImageId: string;
  profileImageUrl: string;
}

// Create user
export const addUser = async (user: UserDataWithImage) => {
  try {
    // Create user using the Admin API
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
        },
      });

    if (authError) throw authError;

    // Store user data in the database using Drizzle ORM
    if (authUser.user) {
      const newUser = {
        id: authUser.user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImageId: user.profileImageId || "",
        profileImageUrl: user.profileImageUrl || "",
        isActive: true,
      };

      const insertedUser = await db
        .insert(usersTable)
        .values(newUser)
        .returning();

      revalidatePath("/users");
      return parseStringify(insertedUser);
    }
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Edit user
interface EditUserWithImage extends Omit<EditUserFormValues, "image"> {
  profileImageId: string;
  profileImageUrl: string;
}
export const editUser = async (user: EditUserWithImage, userId: string) => {
  try {
    if (!userId) throw new Error("User ID is required");

    // First, get the current user data to compare
    const currentUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .then((res) => res[0]);

    if (!currentUser) throw new Error("User not found");

    // Update name in Supabase Authentication if changed
    if (currentUser.name !== user.name) {
      const { error: updateNameError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            name: user.name,
          },
        });

      if (updateNameError) throw updateNameError;
    }

    let updatedUser;
    if (user.profileImageId && user.profileImageUrl) {
      updatedUser = await db
        .update(usersTable)
        .set({
          name: user.name,
          phone: user.phone,
          role: user.role,
          profileImageId: user.profileImageId,
          profileImageUrl: user.profileImageUrl,
        })
        .where(eq(usersTable.id, userId))
        .returning();
    } else {
      updatedUser = await db
        .update(usersTable)
        .set({
          name: user.name,
          phone: user.phone,
          role: user.role,
        })
        .where(eq(usersTable.id, userId))
        .returning();
    }

    revalidatePath("/users");
    revalidatePath(`/users/edit-user/${userId}`);
    return parseStringify(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Get users
export const getUsers = async (
  page: number = 0,
  limit: number = 10,
  getAllUsers: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .orderBy(desc(usersTable.createdAt));

    if (!getAllUsers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const users = await query;

    return {
      documents: parseStringify(users),
      total: users.length,
    };
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId: string) => {
  try {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .then((res) => res[0]);

    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId: string) => {
  try {
    // Delete user from the database using Drizzle ORM
    const deletedUser = await db
      .delete(usersTable)
      .where(eq(usersTable.id, userId))
      .returning();

    // Delete user from Supabase Authentication
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );
    if (deleteError) {
      console.warn(
        "Warning: Could not delete user from Supabase:",
        deleteError
      );
    }

    revalidatePath("/users");
    return parseStringify(deletedUser);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Update user password
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

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error updating user password:", error);
    throw error;
  }
};
