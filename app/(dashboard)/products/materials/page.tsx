import { Suspense } from "react";
import Loading from "../../loading";
import "@/app/dynamic-routes";

export const dynamic = "force-dynamic";

const Materials = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Materials page</div>
    </Suspense>
  );
};

export default Materials;
