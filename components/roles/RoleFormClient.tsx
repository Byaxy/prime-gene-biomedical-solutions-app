/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { RoleWithPermissions } from "@/types";
import { RoleFormValues } from "@/lib/actions/role.actions";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import RoleForm from "../forms/RoleForm";

interface RoleFormClientProps {
  mode: "create" | "edit";
  initialData?: RoleWithPermissions;
}

export default function RoleFormClient({
  mode,
  initialData,
}: RoleFormClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { createRole, updateRole, isCreatingRole, isUpdatingRole } = useRoles();

  const handleSubmit = async (data: any) => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      const normalizedData: RoleFormValues = {
        ...data,
        description: data.description || "",
      };

      if (mode === "create") {
        await createRole({ data: normalizedData });
      } else if (initialData && mode === "edit") {
        await updateRole({
          roleId: initialData.role.id,
          data: normalizedData,
        });
      }
      router.push("/settings/roles");
      router.refresh();
    } catch (error: any) {
      console.error(error.message || `Failed to ${mode} role`);
    }
  };

  return (
    <RoleForm
      mode={mode}
      initialData={initialData}
      onSubmit={handleSubmit}
      isSubmitting={isCreatingRole || isUpdatingRole}
    />
  );
}
