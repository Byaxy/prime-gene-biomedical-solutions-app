"use client";

import PageWraper from "@/components/PageWraper";
import { usersColumns } from "@/components/table/columns/usersColumns";
import { DataTable } from "@/components/table/DataTable";
import { UserDialog } from "@/components/users/UserDialog";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { UserFormValues } from "@/lib/validation";
import { useState } from "react";
import toast from "react-hot-toast";

const Users = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { users, addUser, isLoading, isCreatingUser } = useUsers();
  const { isAdmin } = useAuth();

  const handleCreateUser = async (data: UserFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addUser(data, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <PageWraper
      title="Users"
      buttonText="Add User"
      buttonAction={() => {
        if (isAdmin) setIsAddDialogOpen(true);
        if (!isAdmin) toast.error("Only admins can create user");
        return;
      }}
    >
      <>
        <DataTable
          columns={usersColumns}
          data={users || []}
          isLoading={isLoading}
        />

        <UserDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isCreatingUser}
          onSubmit={handleCreateUser}
        />
      </>
    </PageWraper>
  );
};

export default Users;
