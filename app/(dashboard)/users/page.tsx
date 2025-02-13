"use client";

import PageWraper from "@/components/PageWraper";
import { usersColumns } from "@/components/table/columns/usersColumns";
import { DataTable } from "@/components/table/DataTable";
import { UserDialog } from "@/components/users/UserDialog";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { CreateUserFormValues, EditUserFormValues } from "@/lib/validation";
import { useState } from "react";
import toast from "react-hot-toast";

const Users = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    users,
    addUser,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    isCreatingUser,
  } = useUsers({ initialPageSize: 10 });
  const { isAdmin } = useAuth();

  const handleCreateUser = async (
    data: CreateUserFormValues | EditUserFormValues
  ): Promise<void> => {
    // Type guard to check if this is a create operation
    const isCreateForm = (
      data: CreateUserFormValues | EditUserFormValues
    ): data is CreateUserFormValues => "password" in data;

    return new Promise((resolve, reject) => {
      if (isCreateForm(data)) {
        addUser(data, {
          onSuccess: () => {
            setIsAddDialogOpen(false);
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        });
      }
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
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
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
