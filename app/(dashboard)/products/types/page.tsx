import { Suspense } from "react";
import Loading from "../../loading";
import "@/app/dynamic-routes";

export const dynamic = "force-dynamic";

const Types = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Types page</div>;
    </Suspense>
  );
};

export default Types;
