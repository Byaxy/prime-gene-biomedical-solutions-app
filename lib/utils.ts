/* eslint-disable @typescript-eslint/no-explicit-any */

import { CommissionPayout, ProductWithRelations } from "@/types";
import { type ClassValue, clsx } from "clsx";
import { numericFormatter } from "react-number-format";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import { utils, writeFile } from "xlsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => {
  return uuidv4();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseStringify = (value: any) => JSON.parse(JSON.stringify(value));

export const convertFileToUrl = (file: File | string) => {
  if (typeof file === "string") {
    return file;
  }

  if (file instanceof File) {
    return URL.createObjectURL(file);
  }

  // Fallback for any other case
  throw new Error("Invalid file type provided to convertFileToUrl");
};

// FORMAT DATE TIME
export const formatDateTime = (dateString: Date | string) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    // weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    day: "numeric", // numeric day of the month (e.g., '25')
    year: "numeric", // numeric year (e.g., '2023')
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };

  const dateDayOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    year: "numeric", // numeric year (e.g., '2023')
    month: "2-digit", // abbreviated month name (e.g., 'Oct')
    day: "2-digit", // numeric day of the month (e.g., '25')
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short", // abbreviated month name (e.g., 'Oct')
    year: "numeric", // numeric year (e.g., '2023')
    day: "numeric", // numeric day of the month (e.g., '25')
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };

  const formattedDateTime: string = new Date(dateString).toLocaleString(
    "en-US",
    dateTimeOptions
  );

  const formattedDateDay: string = new Date(dateString).toLocaleString(
    "en-US",
    dateDayOptions
  );

  const formattedDate: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptions
  );

  const formattedTime: string = new Date(dateString).toLocaleString(
    "en-US",
    timeOptions
  );

  return {
    dateTime: formattedDateTime,
    dateDay: formattedDateDay,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  };
};

// Format numner  with currency
export const formatCurrency = (value: string, currency: string) => {
  return numericFormatter(value, {
    thousandSeparator: ",",
    displayType: "text",
    thousandsGroupStyle: "thousand",
    type: "text",
    prefix: currency,
    decimalScale: 2,
    fixedDecimalScale: false,
  });
};

// Format numner
export const formatNumber = (value: string) => {
  return numericFormatter(value, {
    thousandSeparator: ",",
    displayType: "text",
    thousandsGroupStyle: "thousand",
    type: "text",
    decimalScale: 2,
    fixedDecimalScale: false,
  });
};

export const formatCamelCase = (str: string) => {
  const spaced = str.replace(/([a-z])([A-Z])/g, "$1 $2");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const exportToExcel = (data: any[], fileName: string) => {
  const wb = utils.book_new();

  const ws = utils.json_to_sheet(data);

  utils.book_append_sheet(wb, ws, "Products");

  writeFile(wb, `${fileName}.xlsx`);
};

export const transformProductsForExport = (
  products: ProductWithRelations[]
) => {
  return products.map((item) => {
    const product = item.product;
    return {
      id: product.id,
      productID: product.productID,
      name: product.name,
      description: product.description || "",
      quantity: product.quantity,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      alertQuantity: product.alertQuantity,
      maxAlertQuantity: product.maxAlertQuantity,
      Category: item?.category ? item.category.name : "",
      categoryId: product?.categoryId ? product.categoryId : "",
      Brand: item?.brand ? item?.brand.name : "",
      brandId: product?.brandId ? product.brandId : "",
      Type: item?.type ? item.type.name : "",
      typeId: product?.typeId ? product.typeId : "",
      Unit: item?.unit ? item.unit.name : "",
      unitId: product?.unitId ? product.unitId : "",
    };
  });
};

// Function to calculate commission amounts
export const calculateCommissionAmounts = (
  amountReceived: number,
  additions: number,
  deductions: number,
  commissionRate: number, // As a decimal (e.g., 0.10)
  withholdingTaxRate: number // As a decimal (e.g., 0.03)
) => {
  const withholdingTaxAmountCustomer = amountReceived * withholdingTaxRate;
  const actualAmountReceived = amountReceived - withholdingTaxAmountCustomer;

  const withholdingTaxAmount = actualAmountReceived * withholdingTaxRate;

  const baseForCommission = Math.max(
    0,
    actualAmountReceived - withholdingTaxAmount - additions
  );

  const grossCommission = baseForCommission * commissionRate;

  const totalCommissionPayable = Math.max(0, grossCommission - deductions);

  return {
    baseForCommission: parseFloat(baseForCommission.toFixed(2)),
    grossCommission: parseFloat(grossCommission.toFixed(2)),
    withholdingTaxAmount: parseFloat(withholdingTaxAmount.toFixed(2)),
    totalCommissionPayable: parseFloat(totalCommissionPayable.toFixed(2)),
  };
};

// Function to parse server error messages
export const parseServerError = (error: any): string => {
  // Handle error objects with message property
  if (error?.message) {
    return error.message;
  }

  // Handle error objects with error property (from server actions)
  if (error?.error && error?.message) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback
  return "An unexpected error occurred. Please try again.";
};

export const calculateTotalPaidForRecipient = (
  payouts: CommissionPayout[] | undefined
): number => {
  if (!payouts || payouts.length === 0) {
    return 0;
  }
  return payouts.reduce(
    (sum, payout) =>
      sum + (payout.isActive ? parseFloat(payout.amount as any) : 0),
    0
  );
};
