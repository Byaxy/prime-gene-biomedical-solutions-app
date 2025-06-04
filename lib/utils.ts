/* eslint-disable @typescript-eslint/no-explicit-any */

import { ProductWithRelations } from "@/types";
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

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

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
      Category: item.category.name,
      categoryId: product.categoryId,
      Brand: item.brand.name,
      brandId: product.brandId,
      Type: item.type.name,
      typeId: product.typeId,
      Unit: item.unit.name,
      unitId: product.unitId,
    };
  });
};
