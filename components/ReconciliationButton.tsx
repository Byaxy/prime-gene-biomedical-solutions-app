/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { reconcilePromissoryNotes } from "@/lib/actions/promissoryNote.actions";
import { Button } from "./ui/button";

interface ReconciliationResult {
  message: string;
  errors: string[];
  reconciledCount: number;
}

const ReconciliationButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleReconcile = async () => {
    setIsLoading(true);
    const loadingToastId = toast.loading("Starting reconciliation...");

    try {
      const result: ReconciliationResult = await reconcilePromissoryNotes(); // Call the server action

      if (result.errors && result.errors.length > 0) {
        toast.error(
          `Reconciliation finished with ${result.errors.length} error(s). See console for details.`,
          { id: loadingToastId, duration: 8000 }
        );
        console.error("Reconciliation Errors:", result.errors);
      } else {
        toast.success(
          `Reconciliation successful! ${result.reconciledCount} promissory notes processed.`,
          { id: loadingToastId, duration: 5000 }
        );
      }
    } catch (error: any) {
      console.error("Failed to trigger reconciliation:", error);
      toast.error(
        `Failed to start reconciliation: ${error.message || "Unknown error"}`,
        { id: loadingToastId, duration: 8000 }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleReconcile}
      className="shad-primary-btn flex items-center gap-2"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Reconciling...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Reconcile Promissory Notes
        </>
      )}
    </Button>
  );
};

export default ReconciliationButton;
