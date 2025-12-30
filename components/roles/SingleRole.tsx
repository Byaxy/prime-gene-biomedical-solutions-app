import Loading from "@/app/(dashboard)/loading";
import { useRoles } from "@/hooks/useRoles";
import { RoleWithPermissions } from "@/types";

const SingleRole = ({ roleId }: { roleId: string }) => {
  const { roles, isLoading } = useRoles({ getAllRoles: true });

  const role = roles?.find(
    (item: RoleWithPermissions) => item.role.id === roleId
  );

  if (isLoading) {
    return <Loading size={20} />;
  }

  if (!role) {
    return <div className="w-fit">-</div>;
  }
  return <div className="w-fit">{role && <span>{role?.role?.name}</span>}</div>;
};

export default SingleRole;
