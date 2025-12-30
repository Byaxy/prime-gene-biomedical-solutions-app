"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { PermissionAction } from "@/types";

interface PermissionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  route: string;
  action: PermissionAction;
  children: React.ReactNode;
  showDisabled?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export default function PermissionButton({
  route,
  action,
  children,
  showDisabled = false,
  className,
  variant = "default",
  ...props
}: PermissionButtonProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  const permitted = hasPermission(route, action);

  if (!permitted && !showDisabled) {
    return null;
  }

  return (
    <Button
      variant={variant}
      className={cn(className)}
      disabled={!permitted || props.disabled}
      {...props}
    >
      {children}
    </Button>
  );
}
