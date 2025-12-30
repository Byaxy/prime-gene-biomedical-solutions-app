/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COOKIE_MAX_AGE = 30; // days

export const useAuth = () => {
  const searchParams = useSearchParams();
  const {
    user,
    role,
    permissions,
    isAdmin,
    isLoading,
    setUser,
    setRole,
    setPermissions,
    setIsAdmin,
    setIsLoading,
  } = useAuthStore();

  const supabase = createSupabaseBrowserClient();

  // Fetch user role and permissions
  const fetchUserRoleAndPermissions = async (userId: string) => {
    if (!userId) {
      setRole(null);
      setPermissions(new Map());
      setIsAdmin(false);
      return;
    }

    try {
      // Fetch user with role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          `
          *,
          role:roles(*)
        `
        )
        .eq("id", userId)
        .single();

      if (userError) throw userError;

      if (!userData.role) {
        console.error("User has no role assigned");
        setRole(null);
        setPermissions(new Map());
        setIsAdmin(false);
        return;
      }

      setRole(userData.role);
      setIsAdmin(userData.role?.name === "admin");

      // Fetch permissions for this role
      const { data: permissionsData, error: permError } = await supabase
        .from("permissions")
        .select("*")
        .eq("role_id", userData.role.id);

      if (permError) throw permError;

      // Convert to Map for easy lookup
      const permMap = new Map();
      if (permissionsData && permissionsData.length > 0) {
        permissionsData.forEach((perm: any) => {
          permMap.set(perm.route, {
            canCreate: perm.can_create,
            canRead: perm.can_read,
            canUpdate: perm.can_update,
            canDelete: perm.can_delete,
          });
        });
      }

      setPermissions(permMap);
    } catch (error) {
      console.error("Error fetching user role and permissions:", error);
      setRole(null);
      setPermissions(new Map());
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
        roleId: data.role_id,
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
          await fetchUserRoleAndPermissions(user.id);

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
          setRole(null);
          setPermissions(new Map());
          setIsAdmin(false);
          Cookies.remove("auth_session");
          return null;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setRole(null);
        setPermissions(new Map());
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
      await fetchUserRoleAndPermissions(user.id);

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
      setRole(null);
      setPermissions(new Map());
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
    role,
    permissions,
    isAdmin,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    checkAuth,
  };
};
