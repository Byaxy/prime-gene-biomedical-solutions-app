import { Suspense } from "react";
import Loading from "../loading";

export const dynamic = "force-dynamic";

const Settings = () => {
  return (
    <Suspense fallback={<Loading />}>
      <div>Settings page</div>
    </Suspense>
  );
};

export default Settings;
