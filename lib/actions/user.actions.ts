/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { ID } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_USERS_COLLECTION_ID,
} from "../appwrite-server";
import { account } from "../appwrite-client";

// create user
export const createUser = async (user: CreateUserParams) => {
  try {
    // Verify admin status
    //const admin = await account.get();

    // Fetch user's role from the database
    //const adminDoc = await databases.getDocument(
    //  DATABASE_ID!,
    //  USERS_COLLECTION_ID!,
    //  admin.$id
    //);

    //if (adminDoc.role !== "admin") {
    //  throw new Error("Unauthorized: Only admins can create users");
    //}

    // Create user in Appwrite Authentication
    const newUser = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (newUser) {
      const dbUser = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
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
  } catch (error: any) {
    console.error("Error creating user:", error);
    throw error;
  }
};
