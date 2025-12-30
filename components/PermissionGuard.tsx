"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import Unauthorized from "./Unauthorized";
import { PermissionAction } from "@/types";

interface PermissionGuardProps {
  route: string;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUnauthorized?: boolean;
}

export default function PermissionGuard({
  route,
  action,
  children,
  fallback = null,
  showUnauthorized = false,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  const permitted = hasPermission(route, action);

  if (!permitted) {
    if (showUnauthorized) {
      return <Unauthorized />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
