import { Suspense } from "react";
import Loading from "../loading";

export const dynamic = "force-dynamic";

const Users = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Users page</div>
    </Suspense>
  );
};

export default Users;
