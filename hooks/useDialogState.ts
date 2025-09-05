"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useDialogState(paramName: string = "dialog") {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isOpen = searchParams.get(paramName) === "open";

  const openDialog = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, "open");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [paramName, router, searchParams]);

  const closeDialog = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete(paramName);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [paramName, router, searchParams]);

  return { isOpen, openDialog, closeDialog };
}
