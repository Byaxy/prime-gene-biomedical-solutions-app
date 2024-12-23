/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { Models } from "appwrite";
import { useSearchParams } from "next/navigation";
import { account, databases } from "@/lib/appwrite-client";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
  isLoading: false,
});

const COOKIE_MAX_AGE = 30; // days

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();

  const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID;
  const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_USERS_COLLECTION_ID;

  const checkAdminStatus = useCallback(
    async (userId: string) => {
      if (!userId || !DATABASE_ID || !USERS_COLLECTION_ID) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await databases.getDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          userId
        );

        setIsAdmin(response?.role === "admin");
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    },
    [DATABASE_ID, USERS_COLLECTION_ID]
  );

  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await account.get();

        if (currentUser) {
          setUser(currentUser);
          await checkAdminStatus(currentUser.$id);

          if (!Cookies.get("auth_session")) {
            Cookies.set("auth_session", "true", {
              expires: COOKIE_MAX_AGE,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          Cookies.remove("auth_session");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setIsAdmin(false);
        Cookies.remove("auth_session");
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [checkAdminStatus]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      await checkAdminStatus(currentUser.$id);

      // Set auth cookie
      Cookies.set("auth_session", "true", {
        expires: COOKIE_MAX_AGE,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      toast.success("Login successful");

      // Handle redirect
      const redirectTo = searchParams.get("redirectTo") || "/";

      // Use window.location for a full page refresh to ensure middleware picks up the new cookie
      window.location.href = redirectTo;
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please try again.";
      toast.error(errorMessage);
      console.error("Login failed", error);
      Cookies.remove("auth_session");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await account.deleteSessions();
      setUser(null);
      setIsAdmin(false);

      // Remove auth cookie
      Cookies.remove("auth_session");

      // Use window.location for a full page refresh
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
