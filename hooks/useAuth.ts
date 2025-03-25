/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COOKIE_MAX_AGE = 30; // days

export const useAuth = () => {
  const searchParams = useSearchParams();
  const { user, isAdmin, isLoading, setUser, setIsAdmin, setIsLoading } =
    useAuthStore();

  const supabase = createSupabaseBrowserClient();

  // Check admin status
  const checkAdminStatus = async (userId: string) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  // Get user data from db
  const getCurrentUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        profileImageId: data.profile_image_id,
        profileImageUrl: data.profile_image_url,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  };

  // Initial auth check query
  const { refetch: checkAuth } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getUser();

        if (data.user) {
          const user = data.user;
          await getCurrentUserData(user.id);
          await checkAdminStatus(user.id);

          if (!Cookies.get("auth_session")) {
            Cookies.set("auth_session", "true", {
              expires: COOKIE_MAX_AGE,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
          return user;
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      return data.user;
    },
    onSuccess: async (user) => {
      await getCurrentUserData(user.id);
      await checkAdminStatus(user.id);

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
      await supabase.auth.signOut();
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
