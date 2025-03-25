"use client";

import PageWraper from "@/components/PageWraper";
import { usersColumns } from "@/components/table/columns/usersColumns";
import { DataTable } from "@/components/table/DataTable";
import { useUsers } from "@/hooks/useUsers";

const Users = () => {
  const { users, totalItems, page, setPage, pageSize, setPageSize, isLoading } =
    useUsers({ initialPageSize: 10 });

  return (
    <PageWraper
      title="Users"
      buttonText="Add User"
      buttonPath="/users/add-user"
    >
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
    </PageWraper>
  );
};

export default Users;
