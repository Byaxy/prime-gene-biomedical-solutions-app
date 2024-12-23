"use client";

import { Suspense } from "react";
import "@/app/dynamic-routes";
import Loading from "./loading";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <div>Dashboard</div>;
    </Suspense>
  );
}
