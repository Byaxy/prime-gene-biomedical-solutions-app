"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesAgentWithRelations } from "@/types";
import { useSalesAgents } from "@/hooks/useSalesAgents";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";

interface SalesAgentDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: () => void;
  salesAgent: SalesAgentWithRelations;
}

const SalesAgentDialog: React.FC<SalesAgentDialogProps> = ({
  mode,
  open,
  onOpenChange,
  salesAgent,
}) => {
  const { softDeleteSalesAgent, isSoftDeletingSalesAgent } = useSalesAgents();

  const handleDelete = async () => {
    try {
      if (salesAgent?.salesAgent?.id) {
        await softDeleteSalesAgent(salesAgent.salesAgent.id, {
          onSuccess: () => {
            toast.success("Sales agent deactivated successfully.");
            onOpenChange();
          },
          onError: (error) => {
            console.error("Error deactivating sales agent:", error);
            toast.error(error.message || "Failed to deactivate sales agent.");
          },
        });
      } else {
        throw new Error("Sales Agent ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  if (!salesAgent?.salesAgent) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-light-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Deactivate Sales Agent"
              : `Sales Agent Details: ${salesAgent.salesAgent.name}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to deactivate this sales agent? This action will prevent them from being assigned new commissions."
              : `Details for Sales Agent (${salesAgent.salesAgent.agentCode}).`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-dark-600">
            <div>
              <p className="font-semibold">Name:</p>
              <p>{salesAgent.salesAgent.name}</p>
            </div>
            <div>
              <p className="font-semibold">Agent Code:</p>
              <p>{salesAgent.salesAgent.agentCode}</p>
            </div>
            <div>
              <p className="font-semibold">Email:</p>
              <p>{salesAgent.salesAgent.email || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Phone:</p>
              <p>{salesAgent.salesAgent.phone}</p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold">Linked System User:</p>
              <p>
                {salesAgent.user?.name
                  ? `${salesAgent.user.name} (${salesAgent.user.email})`
                  : "None"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold">Notes:</p>
              <p>{salesAgent.salesAgent.notes || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Status:</p>
              <p>
                <span
                  className={cn(
                    "text-14-medium capitalize",
                    salesAgent.salesAgent.isActive
                      ? "bg-green-500"
                      : "bg-red-600",
                    "text-white px-3 py-1 rounded-xl"
                  )}
                >
                  {salesAgent.salesAgent.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
            <div>
              <p className="font-semibold">Created At:</p>
              <p>{formatDateTime(salesAgent.salesAgent.createdAt).dateTime}</p>
            </div>
            <div>
              <p className="font-semibold">Last Updated:</p>
              <p>{formatDateTime(salesAgent.salesAgent.updatedAt).dateTime}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4">
          {mode === "delete" && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSoftDeletingSalesAgent}
              className="shad-danger-btn"
            >
              Deactivate
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesAgentDialog;
