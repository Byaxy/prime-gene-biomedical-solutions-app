import { RoleWithPermissions } from "@/types";
import { getRoleById } from "@/lib/actions/role.actions";
import { notFound } from "next/navigation";
import { parseStringify } from "@/lib/utils";
import RoleFormClient from "./RoleFormClient";

interface RoleFormWrapperProps {
  mode: "create" | "edit";
  roleId?: string;
}

export default async function RoleFormWrapper({
  mode,
  roleId,
}: RoleFormWrapperProps) {
  let initialData: RoleWithPermissions | undefined;

  if (mode === "edit") {
    if (!roleId) notFound();
    const fetchedRole = await getRoleById(roleId);
    if (!fetchedRole) notFound();
    initialData = parseStringify(fetchedRole);
  }

  return <RoleFormClient mode={mode} initialData={initialData} />;
}
