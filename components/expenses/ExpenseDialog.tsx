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
import { ExpenseWithRelations } from "@/types";
import { useExpenses } from "@/hooks/useExpenses";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { FileText, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface ExpenseDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: () => void;
  expense: ExpenseWithRelations;
}

const ExpenseDialog: React.FC<ExpenseDialogProps> = ({
  mode,
  open,
  onOpenChange,
  expense,
}) => {
  const { softDeleteExpense, isSoftDeletingExpense } = useExpenses();
  const { user } = useAuth();

  const handleDelete = async () => {
    try {
      if (expense?.expense?.id && user?.id) {
        await softDeleteExpense(
          { id: expense.expense.id, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Expense deactivated successfully.");
              onOpenChange();
            },
            onError: (error) => {
              console.error("Error deactivating expense:", error);
              toast.error(error.message || "Failed to deactivate expense.");
            },
          }
        );
      } else {
        throw new Error("Expense ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  const handleDownloadAttachments = () => {
    if (expense.expense.attachments && expense.expense.attachments.length > 0) {
      expense.expense.attachments.forEach((attachment) => {
        const link = document.createElement("a");
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      toast.success("Downloading attachments...");
    } else {
      toast.error("No attachments to download.");
    }
  };

  if (!expense?.expense) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl bg-light-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Deactivate Expense"
              : `Expense Details: ${expense.expense.referenceNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to deactivate this expense? This action will prevent further use but will preserve historical data."
              : `Details for (${expense.expense.referenceNumber}).`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="flex flex-col gap-4 text-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Reference Number:</p>
                <p>{expense.expense.referenceNumber}</p>
              </div>
              <div>
                <p className="font-semibold">Date:</p>
                <p>{formatDateTime(expense.expense.expenseDate).dateOnly}</p>
              </div>
              <div>
                <p className="font-semibold">Total Amount:</p>
                <p>
                  <FormatNumber value={expense.expense.amount} />
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-semibold">Expense Items</p>

              <Table className="shad-table">
                <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[2%] text-center">#</TableHead>
                    <TableHead className="w-[20%]">Title</TableHead>
                    <TableHead className="w-[10%]">Amount</TableHead>
                    <TableHead className="w-[15%]">Paying Account</TableHead>
                    <TableHead className="w-[13%]">Category</TableHead>
                    <TableHead className="w-[12%]">Payee</TableHead>
                    <TableHead className="w-[6%]">Accompanying?</TableHead>
                    <TableHead className="w-[10%]">Linked Purchase</TableHead>
                    <TableHead className="w-[10%]">Acc. Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="w-full bg-white text-blue-800">
                  {expense.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        {` No expense items found.`}
                      </TableCell>
                    </TableRow>
                  )}
                  {expense.items.map((item, index) => {
                    return (
                      <TableRow
                        key={item.expenseItem.id}
                        className={cn("w-full", {
                          "bg-blue-50": index % 2 === 1,
                        })}
                      >
                        <TableCell className="text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell>{item?.expenseItem.title}</TableCell>
                        <TableCell>{item?.expenseItem.itemAmount}</TableCell>
                        <TableCell>{item?.payingAccount.name}</TableCell>
                        <TableCell>{item?.category.name}</TableCell>
                        <TableCell>{item?.expenseItem.payee || "-"}</TableCell>
                        <TableCell>
                          {item.accompanyingExpenseType ? (
                            <span className="py-1 px-2 rounded-md bg-green-500 text-white">
                              Yes
                            </span>
                          ) : (
                            <span className="py-1 px-2 rounded-md bg-red-500 text-white">
                              No
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.purchase ? (
                            <span>
                              {item?.purchase
                                ? item.purchase.purchaseNumber
                                : "-"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {item?.accompanyingExpenseType
                            ? item.accompanyingExpenseType.name
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="col-span-2">
              <p className="font-semibold">Internal Notes:</p>
              <p>{expense.expense.notes || "-"}</p>
            </div>
            {expense.expense.attachments &&
              expense.expense.attachments.length > 0 && (
                <div className="col-span-2">
                  <p className="font-semibold">
                    Attachments ({expense.expense.attachments.length}):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {expense.expense.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm bg-gray-100 p-2 rounded-md"
                      >
                        <FileText className="h-4 w-4" /> {file.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Status:</p>
                <p>
                  <span
                    className={cn(
                      "text-14-medium capitalize",
                      expense.expense.isActive ? "bg-green-500" : "bg-red-600",
                      "text-white px-3 py-1 rounded-xl"
                    )}
                  >
                    {expense.expense.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-semibold">Created At:</p>
                <p>{formatDateTime(expense.expense.createdAt).dateTime}</p>
              </div>
              <div>
                <p className="font-semibold">Last Updated:</p>
                <p>{formatDateTime(expense.expense.updatedAt).dateTime}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4">
          {mode === "view" && (
            <>
              {expense.expense.attachments &&
                expense.expense.attachments.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadAttachments}
                    className="shad-gray-btn"
                  >
                    <Download className="h-5 w-5 mr-2" /> Download Attachments
                  </Button>
                )}
            </>
          )}
          {mode === "delete" && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSoftDeletingExpense}
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

export default ExpenseDialog;
