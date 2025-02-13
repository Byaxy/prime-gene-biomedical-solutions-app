/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { account, databases } from "@/lib/appwrite-client";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useSearchParams } from "next/navigation";

const COOKIE_MAX_AGE = 30; // days

export const useAuth = () => {
  const searchParams = useSearchParams();
  const { user, isAdmin, isLoading, setUser, setIsAdmin, setIsLoading } =
    useAuthStore();

  const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID;
  const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_USERS_COLLECTION_ID;

  // Check admin status
  const checkAdminStatus = async (userId: string) => {
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
  };

  // Initial auth check query
  const { refetch: checkAuth } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
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
          return currentUser;
        } else {
          setUser(null);
          setIsAdmin(false);
          Cookies.remove("auth_session");
          return null;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setIsAdmin(false);
        Cookies.remove("auth_session");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      setIsLoading(true);
      await account.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );
      const currentUser = await account.get();
      return currentUser;
    },
    onSuccess: async (currentUser) => {
      setUser(currentUser);
      await checkAdminStatus(currentUser.$id);

      Cookies.set("auth_session", "true", {
        expires: COOKIE_MAX_AGE,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      toast.success("Login successful");

      // Handle redirect
      const redirectTo = searchParams?.get("redirectTo") || "/";
      window.location.href = redirectTo;
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Login failed. Please try again.";
      toast.error(errorMessage);
      console.error("Login error:", error);
      Cookies.remove("auth_session");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      await account.deleteSessions();
    },
    onSuccess: () => {
      setUser(null);
      setIsAdmin(false);
      Cookies.remove("auth_session");
      window.location.href = "/login";
      toast.success("Logout successful");
    },
    onError: (error) => {
      toast.error("Logout failed");
      console.error("Logout error:", error);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    user,
    isAdmin,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    checkAuth,
  };
};
