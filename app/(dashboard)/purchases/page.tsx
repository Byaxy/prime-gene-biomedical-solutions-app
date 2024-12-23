import "@/app/dynamic-routes";
import { Suspense } from "react";
import Loading from "../loading";

export const dynamic = "force-dynamic";

const Purchases = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Purchases page</div>;
    </Suspense>
  );
};

export default Purchases;
