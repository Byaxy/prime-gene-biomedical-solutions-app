import { PermissionAction } from "@/types";
import { createSupabaseServerClient } from "./supabase/server";

export async function userHasPermission(
  userId: string,
  route: string,
  action: PermissionAction
): Promise<boolean> {
  try {
    const supabase = createSupabaseServerClient();

    // Get user's roleId
    const { data: userData, error: userError } = await (await supabase)
      .from("users")
      .select("role_id")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Supabase error fetching user role:", userError.message);
      return false;
    }

    if (!userData?.role_id) {
      return false;
    }

    // Get permission for this role and route
    const { data: permissionData, error: permissionError } = await (
      await supabase
    )
      .from("permissions")
      .select("can_create, can_read, can_update, can_delete")
      .eq("role_id", userData.role_id)
      .eq("route", route)
      .single();

    if (permissionError) {
      console.error(
        "Supabase error fetching permission:",
        permissionError.message
      );
      return false;
    }

    if (!permissionData) {
      return false;
    }

    // Check specific action
    switch (action) {
      case "create":
        return permissionData.can_create;
      case "read":
        return permissionData.can_read;
      case "update":
        return permissionData.can_update;
      case "delete":
        return permissionData.can_delete;
      default:
        return false;
    }
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}
