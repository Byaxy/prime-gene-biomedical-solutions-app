import PageWraper from "@/components/PageWraper";
import { UserFilters } from "@/hooks/useUsers";
import { Suspense } from "react";
import { getUsers } from "@/lib/actions/user.actions";
import dynamic from "next/dynamic";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const UsersTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: UserFilters;
}) => {
  const initialData = await getUsers(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const UsersTable = dynamic(() => import("@/components/users/UsersTable"));
  return <UsersTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

const Users = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: UserFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper
      title="Users"
      buttonText="Add User"
      buttonPath="/users/add-user"
    >
      <Suspense fallback={<TableSkeleton />}>
        <UsersTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Users;
