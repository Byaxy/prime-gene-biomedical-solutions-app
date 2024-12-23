import { Suspense } from "react";
import Loading from "../loading";
import "@/app/dynamic-routes";

export const dynamic = "force-dynamic";

const Expenses = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Expenses page</div>;
    </Suspense>
  );
};

export default Expenses;
