"use client";

import type React from "react";

import { forwardRef } from "react";
import type { Sale } from "@/types/appwrite.types";
import { formatDateTime, cn } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import Image from "next/image";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ColumnDef } from "@tanstack/react-table";
import { ItemsTable } from "../table/ItemsTables";

interface SaleInvoiceProps {
  sale: Sale;
  componentRef?: React.RefObject<HTMLDivElement | null>;
}

interface SaleItems {
  index: number;
  productId: {
    name: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const columns: ColumnDef<SaleItems>[] = [
  {
    header: "No.",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
  },
  {
    header: "Product",
    cell: ({ row }) => {
      return (
        <p className="text-14-medium pl-2">{row.original.productId?.name}</p>
      );
    },
  },
  {
    header: "Qty",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.original.quantity}</p>;
    },
  },
  {
    header: "Unit Price",
    cell: ({ row }) => {
      return (
        <p className="text-14-medium pl-2">
          <FormatNumber value={row.original.unitPrice} />
        </p>
      );
    },
  },
  {
    header: "Total",
    cell: ({ row }) => {
      return (
        <p className="text-14-medium pl-2">
          <FormatNumber value={row.original.totalPrice} />
        </p>
      );
    },
  },
];

const SaleInvoice = forwardRef<HTMLDivElement, SaleInvoiceProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ sale, componentRef }, ref) => {
    const { companySettings } = useCompanySettings();

    // Calculate totals
    const subtotal = sale.products.reduce(
      (sum, product) => sum + product.quantity * product.unitPrice,
      0
    );
    const balance = subtotal - (sale.amountPaid || 0);

    console.log(companySettings);
    console.log("sale", sale);

    return (
      <div
        ref={componentRef}
        className="bg-white p-8 min-h-[842px] w-full max-w-4xl mx-auto shadow-md rounded-lg"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div className="flex flex-col">
            <div className="mb-4">
              <Image
                src={"/assets/logos/Logo.png"}
                alt="Company Logo"
                width={300}
                height={100}
                className="mb-2"
              />
            </div>

            <h1 className="text-xl font-bold text-blue-800">INVOICE</h1>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-blue-800">
              #{sale.invoiceNumber || "N/A"}
            </p>
            <p className="text-dark-600">
              Date:{" "}
              {sale.saleDate
                ? formatDateTime(sale.saleDate).dateTime
                : new Date().toLocaleDateString()}
            </p>
            <p className="text-dark-600 mt-2">
              Due Date: {new Date().toLocaleDateString()}
            </p>
            <div className="mt-2">
              <span className="text-dark-600 mr-2">Status:</span>
              <span
                className={cn(
                  "text-sm font-medium px-3 py-1 rounded-full",
                  sale.status === "pending" && "bg-orange-500 text-white",
                  sale.status === "completed" && "bg-green-500 text-white",
                  sale.status === "cancelled" && "bg-red-600 text-white"
                )}
              >
                {sale.status || "pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* From - Company Info */}
          <div>
            <h2 className="text-blue-800 font-semibold mb-2 text-sm uppercase tracking-wider">
              From:
            </h2>
            <p className="font-medium text-dark-600 text-sm">
              {companySettings[0]?.name}
            </p>
            <p className="text-dark-600 text-sm">{companySettings[0]?.email}</p>
            <p className="text-dark-600 text-sm">{companySettings[0]?.phone}</p>
            <p className="text-dark-600 text-sm">
              {companySettings[0]?.address}, {companySettings[0]?.city}
            </p>
          </div>

          {/* To - Customer Info */}
          <div className="text-right">
            <h2 className="text-blue-800 font-semibold mb-2 text-sm uppercase tracking-wider">
              Bill To:
            </h2>
            <p className="font-medium text-dark-600 text-sm">
              {sale.customer?.name}
            </p>
            <p className="text-dark-600 text-sm">{sale.customer?.email}</p>
            <p className="text-dark-600 text-sm">{sale.customer?.phone}</p>
          </div>
        </div>

        {/* Products Table */}
        <div className="mb-8 overflow-x-auto">
          <ItemsTable columns={columns} data={sale.products} />
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-64 text-blue-800 text-sm font-semibold">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              {typeof FormatNumber === "function" ? (
                <FormatNumber value={subtotal} />
              ) : (
                `$${subtotal.toFixed(2)}`
              )}
            </div>

            <div className="flex justify-between mb-2">
              <span>Discount:</span>
              <FormatNumber value={0.0} />
            </div>

            <div className="flex justify-between mb-2">
              <span>Tax ({0}%):</span>
              <FormatNumber value={0} />
            </div>

            <div className="flex justify-between mb-2 pt-2 border-t border-gray-200">
              <span>Amount Paid:</span>
              <FormatNumber value={sale.amountPaid || 0} />
            </div>

            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span>Balance:</span>
              <FormatNumber value={balance} />
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-4 text-sm">
          {/* Notes */}
          {sale.notes && (
            <div>
              <h3 className="font-medium mb-2 text-blue-800">Notes:</h3>
              <p className="text-dark-600">{sale.notes}</p>
            </div>
          )}

          {/* Payment Info */}
          <div className={sale.notes ? "" : "col-span-2"}>
            <h3 className="font-medium mb-2 text-blue-800">Payment Details:</h3>
            <p className="text-dark-600">
              Payment Method:{" "}
              {sale.paymentMethod.toLocaleUpperCase().split("-").join(" ") ||
                "N/A"}
            </p>
            {sale.paymentMethod === "check" && (
              <>
                <p className="text-dark-600">Bank: {"N/A"}</p>
                <p className="text-dark-600">Account: {"N/A"}</p>
                <p className="text-dark-600">Swift Code: {"UNAFLRLM"}</p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t text-center text-blue-800 text-sm">
          <p>Thank you for doing business with us!</p>
        </div>
      </div>
    );
  }
);

SaleInvoice.displayName = "SaleInvoice";

export default SaleInvoice;
