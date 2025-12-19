"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BackorderFulfillmentForm from "@/components/forms/BackorderFulfillmentForm";
import { BackorderWithRelations } from "@/types";
import { useBackorders } from "@/hooks/useBackorders";
import toast from "react-hot-toast";
import { Button } from "../ui/button";

interface BackorderFulfillmentDialogProps {
  mode: "fullfill" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backOrder: BackorderWithRelations;
}

const BackorderFulfillmentDialog = ({
  mode,
  open,
  onOpenChange,
  backOrder,
}: BackorderFulfillmentDialogProps) => {
  const { softDeleteBackorder, isSoftDeletingBackorder } = useBackorders();

  const handleDelete = async () => {
    try {
      if (backOrder.backorder.id) {
        await softDeleteBackorder(backOrder.backorder.id, {
          onSuccess: () => {
            toast.success("Backorder deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting backorder:", error);
            toast.error(error.message || "Failed to delete backorder.");
          },
        });
      } else {
        throw new Error("Backorder ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deletion.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl bg-light-200"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element) {
            if (
              e.target.closest('[role="listbox"]') ||
              e.target.closest("[data-radix-select-viewport]") ||
              e.target.closest("[data-radix-popper-content]")
            ) {
              e.preventDefault();
              return;
            }
          }

          const event = e.detail.originalEvent;
          if (event instanceof PointerEvent) {
            event.stopPropagation();
          }
        }}
      >
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            {mode === "fullfill" ? "Fulfill Back-order" : "Delete Back-order"}
          </DialogTitle>
          <DialogDescription className="text-dark-600">
            {mode === "fullfill" &&
              "Fill the form below to fulfill the back-order."}
          </DialogDescription>
        </DialogHeader>
        {mode === "delete" && (
          <p className="text-red-500">
            Are you sure you want to delete this back-order? This action cannot
            be undone.
          </p>
        )}

        {mode === "fullfill" && (
          <>
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-4">
                <p className="col-span-1">PID:</p>
                <p className="col-span-3">{backOrder.product?.productID}</p>
              </div>
              <div className="grid grid-cols-4">
                <p className="col-span-1">Product Name:</p>
                <p className="col-span-3">{backOrder.product?.name}</p>
              </div>
            </div>

            <BackorderFulfillmentForm
              backorder={backOrder}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </>
        )}

        <div className="flex justify-end gap-4 mt-4">
          {mode === "delete" && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSoftDeletingBackorder}
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

export default BackorderFulfillmentDialog;
