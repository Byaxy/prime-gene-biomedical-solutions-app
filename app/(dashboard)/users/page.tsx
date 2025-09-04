"use client";

import toast from "react-hot-toast";
import PageWraper from "@/components/PageWraper";
import { usersColumns } from "@/components/table/columns/usersColumns";
import { DataTable } from "@/components/table/DataTable";
import { useUsers } from "@/hooks/useUsers";
import { exportToExcel } from "@/lib/utils";
import { useState } from "react";
import { User } from "@/types";

const Users = () => {
  const [rowSelection, setRowSelection] = useState({});
  const {
    users,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    refetch,
    isFetching,
  } = useUsers({ initialPageSize: 10 });

  const handleDownloadSelected = async (selectedItems: User[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        role: item.role,
        profileImageId: item.profileImageId ?? "",
        profileImageUrl: item.profileImageUrl ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-users");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting users:", error);
      toast.error("Failed to export users");
    }
  };

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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onDownloadSelected={handleDownloadSelected}
        refetch={refetch}
        isFetching={isFetching}
      />
    </PageWraper>
  );
};

export default Users;
