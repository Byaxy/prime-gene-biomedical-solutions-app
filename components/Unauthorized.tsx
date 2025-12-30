import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] bg-white p-6 rounded-lg shadow-md">
      <ShieldAlert className="h-24 w-24 text-red-600 mb-6" />
      <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="text-lg text-blue-800 mb-2 text-center">
        You do not have the necessary permissions to view this page.
      </p>
      <p className="text-md text-blue-800 mb-8 text-center">
        Please contact your administrator if you believe this is an error.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-800 text-white rounded-md hover:bg-blue-800 transition duration-300"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
