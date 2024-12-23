import { Suspense } from "react";
import Loading from "../loading";

export const dynamic = "force-dynamic";

const Sales = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Sales page</div>;
    </Suspense>
  );
};

export default Sales;
