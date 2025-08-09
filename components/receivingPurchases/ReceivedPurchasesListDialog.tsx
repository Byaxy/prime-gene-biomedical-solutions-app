import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ItemsTable } from "../table/ItemsTable";
import { ReceivedPurchaseWithRelations } from "@/types";
import { receivedPurchasesColumns } from "../table/columns/receivedPurchasesColumns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivedPurchases: ReceivedPurchaseWithRelations[];
}

const ReceivedPurchasesListDialog = ({
  open,
  onOpenChange,
  receivedPurchases,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[120rem] w-full bg-light-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">{`${
            receivedPurchases[0]?.purchase
              ? `Received Inventory for Purchaase Number ${receivedPurchases[0]?.purchase.purchaseNumber}`
              : "Received Inventory"
          }   from Vendor: ${receivedPurchases[0]?.vendor.name}`}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex flex-col w-full h-full py-6 bg-light-200">
          <ItemsTable
            columns={receivedPurchasesColumns}
            data={receivedPurchases}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceivedPurchasesListDialog;
