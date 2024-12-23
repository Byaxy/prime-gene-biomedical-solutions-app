import { Suspense } from "react";
import Loading from "../../loading";
import "@/app/dynamic-routes";

export const dynamic = "force-dynamic";

const Colors = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Colors page</div>;
    </Suspense>
  );
};

export default Colors;
