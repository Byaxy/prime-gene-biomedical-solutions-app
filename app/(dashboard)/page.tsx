"use client";

import { Suspense } from "react";
import "@/app/dynamic-routes";
import Loading from "../../components/loading";
import Overview from "@/components/dashboard/Overview";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <div className="w-full">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Overview />
      </div>
    </Suspense>
  );
}
