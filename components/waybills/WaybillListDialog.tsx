import { WaybillWithRelations } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { waybillColumns } from "../table/columns/waybillColumns";
import { ItemsTable } from "../table/ItemsTable";
import { useState } from "react";
import WaybillDialog from "./WaybillDialog";

interface WaybillListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waybills: WaybillWithRelations[];
}
const WaybillListDialog = ({
  open,
  onOpenChange,
  waybills,
}: WaybillListDialogProps) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState(
    {} as WaybillWithRelations
  );

  const handleRowClick = (rowData: WaybillWithRelations) => {
    setSelectedWaybill(rowData);
    onOpenChange(false);
    setOpenDialog(true);
  };
  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[120rem] w-full bg-light-200"
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
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-800">{`${
              waybills[0]?.sale
                ? `Waybills for sale with ref No. ${waybills[0]?.sale.invoiceNumber}`
                : "Waybills"
            }   for ${waybills[0]?.customer.name}`}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col w-full h-full py-6 bg-light-200">
            <ItemsTable
              columns={waybillColumns}
              data={waybills}
              onRowClick={handleRowClick}
            />
          </div>
        </DialogContent>
      </Dialog>
      <WaybillDialog
        mode="view"
        open={openDialog}
        onOpenChange={setOpenDialog}
        waybill={selectedWaybill}
      />
    </div>
  );
};

export default WaybillListDialog;
