"use client";

import UserForm from "@/components/forms/UserForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { useUsers } from "@/hooks/useUsers";
import { getUserById } from "@/lib/actions/user.actions";
import { EditUserFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

const EditUser = () => {
  const { id } = useParams();
  const { editUser } = useUsers();
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getUserById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  const handleEditUser = async (data: EditUserFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      editUser(
        { id: id as string, data },
        {
          onSuccess: () => {
            router.push("/users");
            router.refresh();
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit User">
      <section className="space-y-6">
        <UserForm
          mode={"edit"}
          onSubmit={handleEditUser}
          initialData={
            user
              ? {
                  ...user,
                  roleId: user.roleId || "",
                  profileImageId: user.profileImageId || "",
                  profileImageUrl: user.profileImageUrl || "",
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default EditUser;
