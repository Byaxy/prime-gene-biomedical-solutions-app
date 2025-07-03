"use client";

import { useWaybills } from "@/hooks/useWaybills";
import {
  ConvertLoanWaybillFormValidation,
  ConvertLoanWaybillFormValues,
} from "@/lib/validation";
import { Customer, SaleWithRelations, WaybillWithRelations } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import SubmitButton from "../SubmitButton";
import { Button } from "../ui/button";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Form } from "../ui/form";
import { SelectItem } from "../ui/select";
import { useCustomers } from "@/hooks/useCustomers";

interface ConvertLoanWaybillFormProps {
  waybill: WaybillWithRelations;
  sale: SaleWithRelations;
}
const ConvertLoanWaybillForm = ({
  waybill,
  sale,
}: ConvertLoanWaybillFormProps) => {
  const { convertLoanWaybill, isConvertingLoanWaybill } = useWaybills();
  const router = useRouter();

  const { customers, isLoading: customersLoading } = useCustomers({
    getAllCustomers: true,
  });

  const matchingProducts = useMemo(() => {
    return waybill.products.filter((waybillProduct) => {
      const matchingSaleProduct = sale.products.find(
        (saleProduct) =>
          saleProduct.productId === waybillProduct.productId &&
          saleProduct.productID === waybillProduct.productID
      );
      return (
        matchingSaleProduct &&
        waybillProduct.quantitySupplied >
          (waybillProduct.quantityConverted || 0)
      );
    });
  }, [waybill.products, sale.products]);

  const form = useForm<ConvertLoanWaybillFormValues>({
    resolver: zodResolver(ConvertLoanWaybillFormValidation),
    defaultValues: {
      waybillRefNumber: waybill.waybill.waybillRefNumber,
      waybillType: waybill.waybill.waybillType,
      customerId: waybill.waybill.customerId || sale.sale.customerId,
      storeId: waybill.waybill.storeId || sale.sale.storeId,
      saleId: sale.sale.id,
      conversionDate: waybill.waybill.conversionDate
        ? new Date(waybill.waybill.conversionDate)
        : new Date(),
      notes: waybill.waybill.notes || "",
      products: matchingProducts.map((product) => {
        const saleProduct = sale.products.find(
          (s) =>
            s.productId === product.productId &&
            s.productID === product.productID
        );

        const alreadyConverted = product.quantityConverted || 0;
        const availableFromWaybill =
          product.quantitySupplied - alreadyConverted;
        const remainingInSale =
          (saleProduct?.quantity ?? 0) - (saleProduct?.fulfilledQuantity || 0);

        const maxConvertibleQuantity = Math.min(
          availableFromWaybill,
          remainingInSale
        );

        return {
          waybillItemId: product.id,
          productId: product.productId,
          productID: product.productID,
          productName: product.productName,
          saleItemId: sale.products.find(
            (s) =>
              s.productId === product.productId &&
              s.productID === product.productID
          )?.id,
          quantityRequested: product.quantityRequested || 0,
          quantitySupplied: product.quantitySupplied || 0,
          quantityToConvert: maxConvertibleQuantity,
          maxConvertibleQuantity: maxConvertibleQuantity,
          balanceLeft: 0,
          fulfilledQuantity: product.fulfilledQuantity || 0,
          quantityConverted: product.quantityConverted || 0,
        };
      }),
    },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  // Calculate max quantity that can be converted for each product
  const calculateMaxConvertibleQuantity = useCallback(
    (index: number) => {
      const waybillProduct = waybill.products.find(
        (p) =>
          p.productId === fields[index].productId &&
          p.productID === fields[index].productID
      );
      if (!waybillProduct) return 0;

      const saleProduct = sale.products.find(
        (p) =>
          p.productId === fields[index].productId &&
          p.productID === fields[index].productID
      );
      if (!saleProduct) return 0;

      const alreadyConverted = waybillProduct.quantityConverted || 0;
      const availableFromWaybill =
        waybillProduct.quantitySupplied - alreadyConverted;
      const remainingInSale =
        saleProduct.quantity - (saleProduct.fulfilledQuantity || 0);

      return Math.min(availableFromWaybill, remainingInSale);
    },
    [waybill.products, sale.products, fields]
  );

  // Handle quantity to convert change
  const handleQuantityToConvertChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const maxQuantity = calculateMaxConvertibleQuantity(index);

    form.setValue(`products.${index}.maxConvertibleQuantity`, maxQuantity);
    form.setValue(`products.${index}.quantityToConvert`, numValue);
  };

  // Handle form submission
  const handleSubmit = async (formData: ConvertLoanWaybillFormValues) => {
    try {
      if (!waybill.waybill?.id || !sale.sale?.id) {
        toast.error("Waybill or Sale not found");
        return;
      }

      await convertLoanWaybill(
        { data: formData, loanWaybillId: waybill.waybill.id },
        {
          onSuccess: () => {
            toast.success("Loan Waybill converted successfully!");
            form.reset();
            router.push("/waybills");
          },
          onError: (error) => {
            console.error("Convert loan waybill error:", error);
            toast.error("Failed to convert loan waybill");
          },
        }
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const maxQuantity = calculateMaxConvertibleQuantity(index);

        form.setValue(`products.${index}.maxConvertibleQuantity`, maxQuantity);
      });
    }
  }, [calculateMaxConvertibleQuantity, fields, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="w-full py-5">
          <div className="bg-blue-50 px-5 py-4 rounded-md mb-4">
            <p className="text-blue-800 font-medium">
              Converting loan waybill: {waybill.waybill.waybillRefNumber} for
              sale: {sale.sale.invoiceNumber}
            </p>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="customerId"
            label="Customer"
            placeholder={`${customersLoading ? "Loading..." : "Customer"}`}
            key={`customer-select-${form.watch("customerId") || ""}`}
            disabled
          >
            {customers?.map((customer: Customer) => (
              <SelectItem
                key={customer.id}
                value={customer.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
              >
                {customer.name}
              </SelectItem>
            ))}
          </CustomFormField>
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="conversionDate"
            label="Conversion Date"
            dateFormat="MM/dd/yyyy"
          />
        </div>

        <Table className="shad-table">
          <TableHeader>
            <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
              <TableHead>#</TableHead>
              <TableHead>PID</TableHead>
              <TableHead>Product Description</TableHead>
              <TableHead>Qnty Supplied</TableHead>
              <TableHead>Max to Convert</TableHead>
              <TableHead>Qnty to Convert</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="w-full bg-white text-blue-800">
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No matching products found for conversion
                </TableCell>
              </TableRow>
            )}
            {fields.map((entry, index) => {
              const maxQuantity = calculateMaxConvertibleQuantity(index);
              return (
                <TableRow
                  key={`${entry.productId}-${index}`}
                  className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{entry.productID}</TableCell>
                  <TableCell>{entry.productName}</TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name={`products.${index}.quantitySupplied`}
                      disabled
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name={`products.${index}.maxConvertibleQuantity`}
                      disabled
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.NUMBER}
                      control={form.control}
                      name={`products.${index}.quantityToConvert`}
                      label=""
                      placeholder={`Max: ${maxQuantity}`}
                      onValueChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleQuantityToConvertChange(index, e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row items-center">
                      <span
                        onClick={() => remove(index)}
                        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Notes"
          placeholder="Enter waybill notes"
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => form.reset()}
            className="shad-danger-btn"
          >
            Cancel
          </Button>
          <SubmitButton
            isLoading={isConvertingLoanWaybill}
            className="shad-primary-btn"
          >
            Convert Waybill
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ConvertLoanWaybillForm;
