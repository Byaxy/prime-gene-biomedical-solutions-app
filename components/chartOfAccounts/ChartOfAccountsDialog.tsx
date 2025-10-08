import { ChartOfAccountWithRelations } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import toast from "react-hot-toast";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ChartOfAccountWithRelations;
}

const ChartOfAccountsDialog = ({
  open,
  onOpenChange,
  account,
}: DialogProps) => {
  const { softDeleteChartOfAccount, isSoftDeletingChartOfAccount } =
    useChartOfAccounts();

  const handleDelete = async () => {
    if (account && account.account.id) {
      const loadingToastId = toast.loading(`Deactivating ${name}...`);
      try {
        await softDeleteChartOfAccount(account.account.id, {
          onSuccess: () => {
            toast.success(`${name} deactivated successfully!`, {
              id: loadingToastId,
            });
          },
          onError: (error) => {
            toast.error(error.message || `Failed to deactivate ${name}.`, {
              id: loadingToastId,
            });
          },
        });
      } catch (error) {
        console.error(`Error deactivating ${name}:`, error);
        toast.error(`Failed to deactivate ${name}.`, { id: loadingToastId });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            Delete Chart Of Account
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            Are you sure you want to delete this Chart Of Account? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-red-500">
            Chart Of Account Name:{" "}
            <span className="font-semibold">{account.account.accountName}</span>
          </p>
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSoftDeletingChartOfAccount}
              className="shad-primary-btn"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSoftDeletingChartOfAccount}
              className="shad-danger-btn"
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartOfAccountsDialog;
