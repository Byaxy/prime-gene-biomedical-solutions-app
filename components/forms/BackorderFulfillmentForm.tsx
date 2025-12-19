"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import CustomFormField, { FormFieldType } from "@/components/CustomFormField";
import SubmitButton from "@/components/SubmitButton";
import { Form } from "@/components/ui/form";
import { SelectItem } from "@/components/ui/select";

import {
  BackorderFulfillmentFormValues,
  BackorderFulfillmentValidation,
} from "@/lib/validation";
import { useBackorders } from "@/hooks/useBackorders";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { BackorderWithRelations, InventoryStockWithRelations } from "@/types";
import { useAuth } from "@/hooks/useAuth";

interface BackorderFulfillmentFormProps {
  backorder: BackorderWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BackorderFulfillmentForm = ({
  backorder,
  onSuccess,
  onCancel,
}: BackorderFulfillmentFormProps) => {
  const { user } = useAuth();
  const { fulfillBackorder, isFulfillingBackorder } = useBackorders();

  const {
    inventoryStock: availableInventoryStocks,
    isLoading: isLoadingInventory,
  } = useInventoryStock({
    getAllInventoryStocks: true,
  });

  const form = useForm<BackorderFulfillmentFormValues>({
    resolver: zodResolver(BackorderFulfillmentValidation),
    defaultValues: {
      backorderId: backorder.backorder.id,
      inventoryStockId: "",
      quantityToFulfill: backorder.backorder.pendingQuantity,
      userId: user?.id || "",
    },
  });

  // Watch the selected inventory stock to inform max quantity
  const selectedInventoryStockId = form.watch("inventoryStockId");

  const filteredInventoryStocks = useMemo(() => {
    return (
      availableInventoryStocks.filter(
        (stock: InventoryStockWithRelations) =>
          stock.product.id === backorder.product?.id &&
          stock.inventory.quantity > 0
      ) || []
    );
  }, [availableInventoryStocks, backorder.product?.id]);

  const selectedInventoryLot = useMemo(() => {
    return filteredInventoryStocks.find(
      (stock: InventoryStockWithRelations) =>
        stock.inventory.id === selectedInventoryStockId
    );
  }, [selectedInventoryStockId, filteredInventoryStocks]);

  const maxQuantityAllowed = useMemo(() => {
    if (!selectedInventoryLot) return 0;

    return Math.min(
      backorder.backorder.pendingQuantity,
      selectedInventoryLot.inventory.quantity
    );
  }, [selectedInventoryLot, backorder.backorder.pendingQuantity]);

  // Handle quantity input change to cap at max and enforce minimum
  const handleQuantityChange = (value: number) => {
    let newQuantity = value;
    if (newQuantity > maxQuantityAllowed) {
      newQuantity = maxQuantityAllowed;
    }
    if (newQuantity < 1) {
      newQuantity = 1;
    }
    form.setValue("quantityToFulfill", newQuantity);
    form.trigger("quantityToFulfill");
  };

  const handleSubmit = async (values: BackorderFulfillmentFormValues) => {
    if (!user?.id) {
      toast.error("User not authenticated.");
      return;
    }

    if (values.quantityToFulfill > maxQuantityAllowed) {
      toast.error(
        `Quantity to fulfill cannot exceed ${maxQuantityAllowed} for this lot.`
      );
      return;
    }

    const loadingToastId = toast.loading("Fulfilling backorder...");
    try {
      await fulfillBackorder({
        backorderId: values.backorderId,
        inventoryStockId: values.inventoryStockId,
        quantityToFulfill: values.quantityToFulfill,
        userId: user.id,
      });
      toast.success("Backorder fulfilled successfully!", {
        id: loadingToastId,
      });
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to fulfill backorder:", error);
      toast.error((error as Error).message || "Failed to fulfill backorder", {
        id: loadingToastId,
      });
    }
  };

  const isFormLoading = isFulfillingBackorder || isLoadingInventory;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="backorderId"
          label="Backorder ID"
          disabled={true}
          placeholder={backorder.backorder.id}
        />

        <CustomFormField
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="inventoryStockId"
          label="Select Inventory Lot"
          placeholder={
            isLoadingInventory
              ? "Loading inventory..."
              : "Select an available lot"
          }
          disabled={isFormLoading || filteredInventoryStocks.length === 0}
        >
          {filteredInventoryStocks.length === 0 ? (
            <SelectItem value="no-stock" disabled>
              No available inventory for this product in this store.
            </SelectItem>
          ) : (
            filteredInventoryStocks.map(
              (stock: InventoryStockWithRelations) => (
                <SelectItem
                  key={stock.inventory.id}
                  value={stock.inventory.id}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                >
                  Lot: {stock.inventory.lotNumber} (Available:{" "}
                  {stock.inventory.quantity})
                </SelectItem>
              )
            )
          )}
        </CustomFormField>

        {selectedInventoryStockId && selectedInventoryLot && (
          <CustomFormField
            fieldType={FormFieldType.NUMBER}
            control={form.control}
            name="quantityToFulfill"
            label={`Quantity to Fulfill (Max: ${maxQuantityAllowed})`}
            placeholder={`Enter quantity (max ${maxQuantityAllowed})`}
            min={1}
            max={maxQuantityAllowed}
            onValueChange={handleQuantityChange}
            disabled={isFormLoading}
          />
        )}

        <div className="flex justify-end gap-4 mt-8">
          <Button
            type="button"
            onClick={onCancel}
            className="shad-danger-btn"
            disabled={isFormLoading}
          >
            Cancel
          </Button>
          <SubmitButton
            isLoading={isFulfillingBackorder}
            className="shad-primary-btn"
            disabled={
              isFormLoading ||
              !selectedInventoryStockId ||
              form.getValues("quantityToFulfill") <= 0
            }
          >
            Fulfill Backorder
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default BackorderFulfillmentForm;
