import { Suspense } from "react";
import Loading from "../loading";
import "@/app/dynamic-routes";

export const dynamic = "force-dynamic";

const Products = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Products page</div>
    </Suspense>
  );
};

export default Products;
