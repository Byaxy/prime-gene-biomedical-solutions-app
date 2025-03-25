"use client";

import UserForm from "@/components/forms/UserForm";
import PageWraper from "@/components/PageWraper";
import { useUsers } from "@/hooks/useUsers";
import { CreateUserFormValues, EditUserFormValues } from "@/lib/validation";

const AddUser = () => {
  const { addUser } = useUsers();
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
    <PageWraper title="Add New User">
      <section className="space-y-6">
        <UserForm mode={"create"} onSubmit={handleCreateUser} />
      </section>
    </PageWraper>
  );
};

export default AddUser;
