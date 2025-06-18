"use client";

import { useCustomers } from "@/hooks/useCustomers";
import { useSales } from "@/hooks/useSales";
import { useStores } from "@/hooks/useStores";
import { useWaybills } from "@/hooks/useWaybills";
import { generateWaybillRefNumber } from "@/lib/actions/waybill.actions";
import {
  CustomerFormValues,
  StoreFormValues,
  WaybillFormValidation,
  WaybillFormValues,
} from "@/lib/validation";
import {
  Customer,
  DeliveryStatus,
  InventoryStockWithRelations,
  SaleItem,
  SaleWithRelations,
  Store,
  WaybillInventoryStock,
  WaybillWithRelations,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { City, Country, ICity, IState, State } from "country-state-city";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";
import Loading from "../loading";
import { SelectItem } from "../ui/select";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { X } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Check } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import SubmitButton from "../SubmitButton";
import CustomerDialog from "../customers/CustomerDialog";
import StoreDialog from "../stores/StoreDialog";
import WaybillStockDialog from "../waybills/WaybillStockDialog";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { useAuth } from "@/hooks/useAuth";

interface WaybillFormProps {
  mode: "create" | "edit";
  initialData?: WaybillWithRelations;
  sourceSale?: SaleWithRelations;
}

const WaybillForm = ({ mode, initialData, sourceSale }: WaybillFormProps) => {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedSaleId, setPrevSelectedSaleId] = useState<string | null>(
    null
  );
  const [states, setStates] = useState<IState[]>(() =>
    initialData?.sale.deliveryAddress?.country
      ? State.getStatesOfCountry(initialData?.sale.deliveryAddress?.country)
      : []
  );
  const [cities, setCities] = useState<ICity[]>(() =>
    initialData?.sale.deliveryAddress?.state
      ? City.getCitiesOfState(
          initialData?.sale.deliveryAddress?.country || "",
          initialData?.sale.deliveryAddress?.state
        )
      : []
  );

  const { user } = useAuth();

  const {
    stores,
    addStore,
    isAddingStore,
    isLoading: storesLoading,
  } = useStores({
    getAllStores: true,
  });
  const {
    customers,
    addCustomer,
    isLoading: customersLoading,
  } = useCustomers({ getAllCustomers: true });
  const { sales, isLoading: salesLoading } = useSales({ getAllSales: true });
  const { inventoryStock } = useInventoryStock({
    getAllInventoryStocks: true,
  });
  const { addWaybill, isAddingWaybill, editWaybill, isEditingWaybill } =
    useWaybills();

  const router = useRouter();

  // Generate Waybill Reference number
  const {
    data: generatedWaybillRefNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["waybill-ref-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateWaybillRefNumber();
      return result;
    },
    enabled: mode === "create",
  });

  // Default values
  const defaultValues = useMemo(
    () => ({
      waybillDate: new Date(),
      waybillRefNumber: generatedWaybillRefNumber || "",
      status: DeliveryStatus.Pending as DeliveryStatus,
      deliveryAddress: {
        addressName: "",
        address: "",
        city: "",
        state: "",
        country: "",
        email: "",
        phone: "",
      },
      customerId: "",
      storeId: "",
      saleId: "",
      notes: "",
      deliveredBy: "",
      receivedBy: "",
      products: [],
    }),
    [generatedWaybillRefNumber]
  );
  const form = useForm<WaybillFormValues>({
    resolver: zodResolver(WaybillFormValidation),
    mode: "all",
    defaultValues: initialData
      ? {
          waybillDate: initialData.waybill.waybillDate
            ? new Date(initialData.waybill.waybillDate)
            : new Date(),
          waybillRefNumber: initialData.waybill.waybillRefNumber || "",
          status: initialData.waybill.status || DeliveryStatus.Pending,
          deliveryAddress: {
            addressName: initialData.waybill.deliveryAddress.addressName || "",
            address: initialData.waybill.deliveryAddress.address || "",
            city: initialData.waybill.deliveryAddress.city || "",
            state: initialData.waybill.deliveryAddress.state || "",
            country: initialData.waybill.deliveryAddress.country || "",
            email: initialData.waybill.deliveryAddress.email || "",
            phone: initialData.waybill.deliveryAddress.phone || "",
          },
          customerId: initialData.customer.id || "",
          storeId: initialData.store.id || "",
          saleId: initialData.waybill.saleId || "",
          notes: initialData.waybill.notes || "",
          deliveredBy: initialData.waybill.deliveredBy || "",
          receivedBy: initialData.waybill.receivedBy || "",
          products: initialData.products.map((product) => ({
            productId: product.productId,
            saleItemId: product.id,
            inventoryStock: product.inventoryStock.map((stock) => ({
              inventoryStockId: stock.inventoryStockId,
              lotNumber: stock.lotNumber,
              quantityTaken: stock.quantityTaken,
              unitPrice: stock.unitPrice,
            })),
            quantityRequested: product.quantityRequested,
            quantitySupplied: product.quantitySupplied,
            balanceLeft: product.balanceLeft,
            fulfilledQuantity: product.fulfilledQuantity,
            productName: product.productName || "",
            productID: product.productID || "",
          })),
        }
      : defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedCountry = form.watch("deliveryAddress.country");
  const selectedState = form.watch("deliveryAddress.state");

  // helper function to check if sale has deliverable products
  const hasDeliverableProducts = (sale: SaleWithRelations): boolean => {
    return sale.products.some(
      (product) =>
        product.fulfilledQuantity < product.quantity &&
        inventoryStock?.some(
          (inv: InventoryStockWithRelations) =>
            inv.product.id === product.productId &&
            inv.store.id === product.storeId &&
            inv.inventory.quantity > 0
        )
    );
  };

  const filteredSales = sales?.filter((sale: SaleWithRelations) => {
    if (mode === "edit") return true;

    if (!searchQuery.trim()) return hasDeliverableProducts(sale);

    const query = searchQuery.toLowerCase().trim();
    return (
      sale.sale.invoiceNumber?.toLowerCase().includes(query) &&
      hasDeliverableProducts(sale)
    );
  });

  // Handle products for selected sale.
  const handleSaleSelection = (saleId: string) => {
    if (!saleId) {
      toast.error("Please select a Sale");
      return;
    }
    if (!sales || sales.length === 0) {
      toast.error("No sales available");
      return;
    }
    const selectedSale: SaleWithRelations = sales?.find(
      (sale: SaleWithRelations) => sale.sale.id === saleId
    );

    if (!selectedSale) {
      toast.error("Selected sale not found");
      return;
    }

    // Clear previous products
    remove();

    const deliveryAddress =
      selectedSale.sale.isDeliveryAddressAdded &&
      selectedSale.sale.deliveryAddress.address !== ""
        ? selectedSale.sale.deliveryAddress
        : {
            ...selectedSale.customer.address,
            email: selectedSale.customer.email,
            phone: selectedSale.customer.phone,
          };

    if (deliveryAddress?.country) {
      const countryStates =
        State.getStatesOfCountry(deliveryAddress.country) || [];
      setStates(countryStates);

      if (deliveryAddress?.state) {
        const stateCities =
          City.getCitiesOfState(
            deliveryAddress.country,
            deliveryAddress.state
          ) || [];
        setCities(stateCities);
      } else {
        setCities([]);
      }
    } else {
      setStates([]);
      setCities([]);
    }

    form.setValue("saleId", selectedSale.sale.id);
    form.setValue("customerId", selectedSale.customer.id);
    form.setValue("storeId", selectedSale.store.id);
    form.setValue("deliveryAddress.country", deliveryAddress?.country || "");
    form.setValue("deliveryAddress.state", deliveryAddress?.state || "");
    form.setValue("deliveryAddress.city", deliveryAddress?.city || "");
    form.setValue(
      "deliveryAddress.addressName",
      deliveryAddress?.addressName || ""
    );
    form.setValue("deliveryAddress.address", deliveryAddress?.address || "");
    form.setValue("deliveryAddress.email", deliveryAddress?.email || "");
    form.setValue("deliveryAddress.phone", deliveryAddress?.phone || "");

    // Process products
    if (selectedSale.products.length > 0) {
      selectedSale.products.forEach(
        (product: SaleItem, productIndex: number) => {
          if (product.fulfilledQuantity >= product.quantity) {
            return;
          }

          const remainingQuantity =
            product.quantity - product.fulfilledQuantity;

          const availableInventory =
            inventoryStock?.filter((inv: InventoryStockWithRelations) => {
              return (
                inv.product.id === product.productId &&
                inv.store.id === product.storeId &&
                inv.product.productID === product.productID &&
                inv.inventory.quantity > 0
              );
            }) || [];

          if (availableInventory.length === 0) {
            console.warn(
              `No inventory available for product ${product.productID}`
            );
            return;
          }

          const totalAvailableQuantity = availableInventory.reduce(
            (total: number, inv: InventoryStockWithRelations) =>
              total + inv.inventory.quantity,
            0
          );

          if (totalAvailableQuantity === 0) {
            return;
          }

          const quantityToSupply = Math.min(
            remainingQuantity,
            totalAvailableQuantity
          );

          let remainingToAllocate = quantityToSupply;
          const allocatedStock: WaybillInventoryStock[] = [];

          for (const stockAllocation of product.inventoryStock) {
            if (remainingToAllocate <= 0) break;

            const inventoryItem = availableInventory.find(
              (inv: InventoryStockWithRelations) =>
                inv.inventory.id === stockAllocation.inventoryStockId
            );

            if (inventoryItem && inventoryItem.inventory.quantity > 0) {
              const quantityFromThisStock = Math.min(
                remainingToAllocate,
                stockAllocation.quantityToTake,
                inventoryItem.inventory.quantity
              );

              if (quantityFromThisStock > 0) {
                allocatedStock.push({
                  inventoryStockId: stockAllocation.inventoryStockId,
                  lotNumber: stockAllocation.lotNumber,
                  quantityTaken: quantityFromThisStock,
                  unitPrice: product.unitPrice,
                });

                remainingToAllocate -= quantityFromThisStock;
              }
            }
          }

          // If we still have quantity to allocate, use remaining available inventory
          if (remainingToAllocate > 0) {
            for (const inventoryItem of availableInventory) {
              if (remainingToAllocate <= 0) break;

              // Check if this inventory is already allocated
              const alreadyAllocated = allocatedStock.some(
                (stock) => stock.inventoryStockId === inventoryItem.inventory.id
              );

              if (!alreadyAllocated && inventoryItem.inventory.quantity > 0) {
                const quantityFromThisStock = Math.min(
                  remainingToAllocate,
                  inventoryItem.inventory.quantity
                );

                if (quantityFromThisStock > 0) {
                  allocatedStock.push({
                    inventoryStockId: inventoryItem.inventory.id,
                    lotNumber: inventoryItem.inventory.lotNumber || "",
                    quantityTaken: quantityFromThisStock,
                    unitPrice: product.unitPrice,
                  });

                  remainingToAllocate -= quantityFromThisStock;
                }
              }
            }
          }

          // Calculate actual supplied quantity from allocations
          const actualSuppliedQuantity = allocatedStock.reduce(
            (total, stock) => total + stock.quantityTaken,
            0
          );

          const balanceLeft = remainingQuantity - actualSuppliedQuantity;

          // Set form error if there's insufficient inventory
          if (
            actualSuppliedQuantity < remainingQuantity &&
            totalAvailableQuantity < remainingQuantity
          ) {
            form.setError(`products.${productIndex}.inventoryStock`, {
              message: `Insufficient inventory. Available: ${totalAvailableQuantity}, Required: ${remainingQuantity}`,
            });
          }

          // Only add products that have some inventory allocation
          if (allocatedStock.length > 0 && actualSuppliedQuantity > 0) {
            append({
              productId: product.productId,
              saleItemId: product.id,
              inventoryStock: allocatedStock,
              quantityRequested: product.quantity,
              quantitySupplied: actualSuppliedQuantity,
              balanceLeft: balanceLeft,
              fulfilledQuantity: product.fulfilledQuantity,
              productName: product.productName,
              productID: product.productID,
            });
          } else {
            console.warn(
              `Product ${product.productID} skipped - no valid inventory allocation`
            );
          }
        }
      );
    }

    // Trigger form validation after a brief delay to ensure state updates
    setTimeout(() => {
      form.trigger([
        "deliveryAddress.country",
        "deliveryAddress.state",
        "deliveryAddress.city",
        "deliveryAddress.addressName",
        "deliveryAddress.address",
        "deliveryAddress.email",
        "deliveryAddress.phone",
        "saleId",
        "customerId",
        "storeId",
        "products",
      ]);
    }, 100);
  };

  useEffect(() => {
    if (selectedCountry) {
      setStates(State.getStatesOfCountry(selectedCountry) || []);
      setCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState) {
      setCities(
        City.getCitiesOfState(selectedCountry ?? "", selectedState ?? "") || []
      );
    }
  }, [selectedState, selectedCountry]);

  // Set initial values for the form
  useEffect(() => {
    if (initialData) {
      remove();
      const deliveryAddress = initialData.waybill.deliveryAddress;

      if (deliveryAddress?.country) {
        const countryStates =
          State.getStatesOfCountry(deliveryAddress.country) || [];
        setStates(countryStates);

        if (deliveryAddress?.state) {
          const stateCities =
            City.getCitiesOfState(
              deliveryAddress.country,
              deliveryAddress.state
            ) || [];
          setCities(stateCities);
        } else {
          setCities([]);
        }
      } else {
        setStates([]);
        setCities([]);
      }

      setTimeout(() => {
        form.reset({
          waybillDate: new Date(initialData.waybill.waybillDate || Date.now()),
          waybillRefNumber: initialData.waybill.waybillRefNumber || "",
          status: initialData.waybill.status,
          customerId: initialData.waybill.customerId || "",
          storeId: initialData.waybill.storeId || "",
          saleId: initialData.waybill.saleId || "",
          notes: initialData.waybill.notes || "",
          deliveredBy: initialData.waybill.deliveredBy || "",
          receivedBy: initialData.waybill.receivedBy || "",
          deliveryAddress: {
            addressName: initialData.waybill.deliveryAddress?.addressName || "",
            address: initialData.waybill.deliveryAddress?.address || "",
            city: initialData.waybill.deliveryAddress?.city || "",
            state: initialData.waybill.deliveryAddress?.state || "",
            country: initialData.waybill.deliveryAddress?.country || "",
            email: initialData.waybill.deliveryAddress?.email || "",
            phone: initialData.waybill.deliveryAddress?.phone || "",
          },
          products: [],
        });

        // Add products after form reset
        if (initialData.products && initialData.products.length > 0) {
          initialData.products.forEach((product) => {
            append({
              productId: product.productId,
              saleItemId: product.id,
              inventoryStock: product.inventoryStock.map((stock) => ({
                inventoryStockId: stock.inventoryStockId,
                lotNumber: stock.lotNumber,
                quantityTaken: stock.quantityTaken,
                unitPrice: stock.unitPrice,
              })),
              quantityRequested: product.quantityRequested,
              quantitySupplied: product.quantitySupplied,
              balanceLeft: product.balanceLeft,
              fulfilledQuantity: product.fulfilledQuantity || 0,
              productName: product.productName || "",
              productID: product.productID || "",
            });
          });
        }

        // Trigger validation after initialization
        setTimeout(() => {
          form.trigger();
        }, 100);
      }, 100);
    } else if (sourceSale) {
      const { sale, customer, products } = sourceSale;

      const deliveryAddress =
        sale.isDeliveryAddressAdded && sale.deliveryAddress.address !== ""
          ? sale.deliveryAddress
          : {
              ...customer.address,
              email: customer.email,
              phone: customer.phone,
            };

      if (deliveryAddress?.country) {
        const countryStates =
          State.getStatesOfCountry(deliveryAddress.country) || [];
        setStates(countryStates);

        if (deliveryAddress?.state) {
          const stateCities =
            City.getCitiesOfState(
              deliveryAddress.country,
              deliveryAddress.state
            ) || [];
          setCities(stateCities);
        } else {
          setCities([]);
        }
      } else {
        setStates([]);
        setCities([]);
      }
      remove();
      form.setValue("customerId", sale.customerId);
      form.setValue("storeId", sale.storeId);
      form.setValue("saleId", sale.id);
      form.setValue(
        "deliveryAddress.addressName",
        deliveryAddress?.addressName
      );
      form.setValue("deliveryAddress.address", deliveryAddress?.address);
      form.setValue("deliveryAddress.city", deliveryAddress?.city);
      form.setValue("deliveryAddress.state", deliveryAddress?.state);
      form.setValue("deliveryAddress.country", deliveryAddress?.country);
      form.setValue("deliveryAddress.email", deliveryAddress?.email);
      form.setValue("deliveryAddress.phone", deliveryAddress?.phone);

      // Process products
      if (products.length > 0) {
        products.forEach((product: SaleItem, productIndex: number) => {
          if (product.fulfilledQuantity >= product.quantity) {
            return;
          }

          const remainingQuantity =
            product.quantity - product.fulfilledQuantity;

          const availableInventory =
            inventoryStock?.filter((inv: InventoryStockWithRelations) => {
              return (
                inv.product.id === product.productId &&
                inv.store.id === product.storeId &&
                inv.product.productID === product.productID &&
                inv.inventory.quantity > 0
              );
            }) || [];

          if (availableInventory.length === 0) {
            console.warn(
              `No inventory available for product ${product.productID}`
            );
            return;
          }

          const totalAvailableQuantity = availableInventory.reduce(
            (total: number, inv: InventoryStockWithRelations) =>
              total + inv.inventory.quantity,
            0
          );

          if (totalAvailableQuantity === 0) {
            return;
          }

          const quantityToSupply = Math.min(
            remainingQuantity,
            totalAvailableQuantity
          );

          let remainingToAllocate = quantityToSupply;
          const allocatedStock: Array<{
            inventoryStockId: string;
            lotNumber: string;
            quantityTaken: number;
            unitPrice: number;
          }> = [];

          for (const stockAllocation of product.inventoryStock) {
            if (remainingToAllocate <= 0) break;

            const inventoryItem = availableInventory.find(
              (inv: InventoryStockWithRelations) =>
                inv.inventory.id === stockAllocation.inventoryStockId
            );

            if (inventoryItem && inventoryItem.inventory.quantity > 0) {
              const quantityFromThisStock = Math.min(
                remainingToAllocate,
                stockAllocation.quantityToTake,
                inventoryItem.inventory.quantity
              );

              if (quantityFromThisStock > 0) {
                allocatedStock.push({
                  inventoryStockId: stockAllocation.inventoryStockId,
                  lotNumber: stockAllocation.lotNumber,
                  quantityTaken: quantityFromThisStock,
                  unitPrice: product.unitPrice,
                });

                remainingToAllocate -= quantityFromThisStock;
              }
            }
          }

          // If we still have quantity to allocate, use remaining available inventory
          if (remainingToAllocate > 0) {
            for (const inventoryItem of availableInventory) {
              if (remainingToAllocate <= 0) break;

              // Check if this inventory is already allocated
              const alreadyAllocated = allocatedStock.some(
                (stock) => stock.inventoryStockId === inventoryItem.inventory.id
              );

              if (!alreadyAllocated && inventoryItem.inventory.quantity > 0) {
                const quantityFromThisStock = Math.min(
                  remainingToAllocate,
                  inventoryItem.inventory.quantity
                );

                if (quantityFromThisStock > 0) {
                  allocatedStock.push({
                    inventoryStockId: inventoryItem.inventory.id,
                    lotNumber: inventoryItem.inventory.lotNumber || "",
                    quantityTaken: quantityFromThisStock,
                    unitPrice: product.unitPrice,
                  });

                  remainingToAllocate -= quantityFromThisStock;
                }
              }
            }
          }

          // Calculate actual supplied quantity from allocations
          const actualSuppliedQuantity = allocatedStock.reduce(
            (total, stock) => total + stock.quantityTaken,
            0
          );

          const balanceLeft = remainingQuantity - actualSuppliedQuantity;

          // Set form error if there's insufficient inventory
          if (
            actualSuppliedQuantity < remainingQuantity &&
            totalAvailableQuantity < remainingQuantity
          ) {
            form.setError(`products.${productIndex}.inventoryStock`, {
              message: `Insufficient inventory. Available: ${totalAvailableQuantity}, Required: ${remainingQuantity}`,
            });
          }

          // Only add products that have some inventory allocation
          if (allocatedStock.length > 0 && actualSuppliedQuantity > 0) {
            append({
              productId: product.productId,
              saleItemId: product.id,
              inventoryStock: allocatedStock,
              quantityRequested: product.quantity,
              quantitySupplied: actualSuppliedQuantity,
              balanceLeft: balanceLeft,
              fulfilledQuantity: product.fulfilledQuantity,
              productName: product.productName,
              productID: product.productID,
            });
          } else {
            console.warn(
              `Product ${product.productID} skipped - no valid inventory allocation`
            );
          }
        });
      }
    }
  }, [
    initialData,
    form,
    stores,
    remove,
    append,
    defaultValues,
    sourceSale,
    generatedWaybillRefNumber,
    inventoryStock,
  ]);

  // Handle country change
  const handleCountryChange = (value: string) => {
    const countryStates = State.getStatesOfCountry(value) || [];
    setStates(countryStates);
    setCities([]);

    form.setValue("deliveryAddress.country", value);
    form.setValue("deliveryAddress.state", "");
    form.setValue("deliveryAddress.city", "");
    form.trigger("deliveryAddress.country");
  };

  // Handle state change
  const handleStateChange = (value: string) => {
    if (!selectedCountry) return;

    const stateCities = City.getCitiesOfState(selectedCountry, value) || [];
    setCities(stateCities);

    form.setValue("deliveryAddress.state", value);
    form.setValue("deliveryAddress.city", "");
    form.trigger("deliveryAddress.state");
  };

  // Set Waybill ref number
  useEffect(() => {
    if (generatedWaybillRefNumber && mode === "create") {
      form.setValue("waybillRefNumber", generatedWaybillRefNumber);
    }
  }, [form, mode, generatedWaybillRefNumber]);

  // Update the refresh button handler (waybillRefNumber)
  const handleRefreshWaybillRefNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedWaybillRefNumber) {
          form.setValue("waybillRefNumber", generatedWaybillRefNumber);
        }
      } catch (error) {
        console.error("Error refreshing waybill ref number:", error);
        toast.error("Failed to refresh waybill ref number");
      }
    }
  };

  // Handle delete entry
  const handleDeleteEntry = (index: number) => {
    remove(index);
  };

  // Update the cancel button handler
  const handleCancel = () => {
    if (mode === "create") {
      form.reset(defaultValues);
      refetch();
    } else {
      form.reset();
    }
  };
  // handle close dialog
  const closeDialog = () => {
    setCustomerDialogOpen(false);
    setStoreDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = form.getValues();
      if (!user?.id) return;
      if (mode === "create") {
        await addWaybill(
          { data: values, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Waybill created successfully!");
              form.reset();
              router.push("/waybills");
            },
            onError: (error) => {
              console.error("Create waybill error:", error);
              toast.error("Failed to create waybill");
            },
          }
        );
      } else if (mode === "edit") {
        if (!initialData?.waybill.id || !user.id) {
          toast.error("Waybill ID and User are required for editing");
          return;
        }
        await editWaybill(
          { id: initialData.waybill.id, data: values, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Waybill updated successfully!");
              form.reset();
              router.push("/waybills");
            },
            onError: (error) => {
              console.error("Edit waybill error:", error);
              toast.error("Failed to update waybill");
            },
          }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  // Calculate entry Balance products
  const calculateEntryBalanceLeft = useCallback(
    (index: number) => {
      const entryQntySupplied =
        form.watch(`products.${index}.quantitySupplied`) || 0;
      const entryQntyRequested =
        form.watch(`products.${index}.quantityRequested`) || 0;
      const entryFulfilledQuantity =
        form.watch(`products.${index}.fulfilledQuantity`) || 0;

      const remainingNeeded = entryQntyRequested - entryFulfilledQuantity;

      const balanceLeft = remainingNeeded - entryQntySupplied;

      return Math.max(0, balanceLeft);
    },
    [form]
  );

  const handleAddCustomer = async (data: CustomerFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addCustomer(data, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };
  const handleAddStore = async (data: StoreFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addStore(data, {
        onSuccess: () => {
          closeDialog();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  // Enhanced validation for preventing over-allocation
  const validateQuantitySupplied = (index: number, newQuantity: number) => {
    const entryQntyRequested =
      form.watch(`products.${index}.quantityRequested`) || 0;
    const entryFulfilledQuantity =
      form.watch(`products.${index}.fulfilledQuantity`) || 0;
    const remainingNeeded = entryQntyRequested - entryFulfilledQuantity;

    if (newQuantity > remainingNeeded) {
      form.setError(`products.${index}.quantitySupplied`, {
        message: `Cannot supply more than remaining quantity (${remainingNeeded})`,
      });
      return false;
    }

    // Check if we have enough inventory allocated
    const allocatedStock = form.watch(`products.${index}.inventoryStock`) || [];
    const totalAllocated = allocatedStock.reduce(
      (total: number, stock: WaybillInventoryStock) =>
        total + (stock.quantityTaken || 0),
      0
    );

    if (newQuantity > totalAllocated) {
      form.setError(`products.${index}.quantitySupplied`, {
        message: `Cannot supply more than allocated inventory (${totalAllocated})`,
      });
      return false;
    }

    form.clearErrors(`products.${index}.quantitySupplied`);
    return true;
  };

  // handle suppliedQuantity change
  const handleQuantitySuppliedChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;

    if (validateQuantitySupplied(index, numValue)) {
      form.setValue(`products.${index}.quantitySupplied`, numValue);

      const balanceLeft = calculateEntryBalanceLeft(index);
      form.setValue(`products.${index}.balanceLeft`, balanceLeft);
    }
  };

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const balanceLeft = calculateEntryBalanceLeft(index);

        form.setValue(`products.${index}.balanceLeft`, balanceLeft);
      });
    }
  }, [calculateEntryBalanceLeft, fields, form]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5 text-dark-500"
        >
          <div className="w-full flex flex-col md:flex-row gap-5">
            <div className="flex flex-1 flex-row gap-2 items-center">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="waybillRefNumber"
                label="Waybill Reference Number"
                placeholder={
                  isLoading || isRefetching
                    ? "Generating..."
                    : "Enter waybill reference number"
                }
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshWaybillRefNumber}
                className="self-end shad-primary-btn px-5"
                disabled={isLoading || isRefetching}
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    isLoading || isRefetching ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="waybillDate"
              label="Waybill Date"
              dateFormat="MM/dd/yyyy"
            />
          </div>
          <div className="w-full flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="customerId"
              label="Customer"
              placeholder="Select sale"
              onAddNew={() => setCustomerDialogOpen(true)}
              key={`customer-select-${form.watch("customerId") || ""}`}
              disabled={true}
            >
              {customersLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
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
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="storeId"
              label="Store"
              placeholder="Select sale"
              onAddNew={() => setStoreDialogOpen(true)}
              key={`store-select-${form.watch("storeId") || ""}`}
              disabled={true}
            >
              {storesLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
              {stores?.map((store: Store) => (
                <SelectItem
                  key={store.id}
                  value={store.id}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {store.name}
                </SelectItem>
              ))}
            </CustomFormField>
          </div>
          <div
            className={`space-y-5 ${
              form.formState.errors.products
                ? "border-2 border-red-500 p-4 rounded-md"
                : ""
            }`}
          >
            <div className="w-full flex flex-col gap-5">
              <div className="w-full sm:w-1/2">
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={form.control}
                  name="saleId"
                  label="Select Sale"
                  placeholder={"Select Sale"}
                  key={`inventory-select-${form.watch("saleId") || ""}`}
                  disabled={!!sourceSale || !!initialData}
                >
                  <div className="py-3">
                    <div className="relative flex items-center rounded-md border border-dark-700 bg-white">
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                      <Input
                        type="text"
                        placeholder="Search by Invoice Number"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                        disabled={salesLoading}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-3 text-dark-700 hover:text-dark-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {salesLoading ? (
                    <div className="py-4">
                      <Loading />
                    </div>
                  ) : filteredSales && filteredSales.length > 0 ? (
                    <>
                      <Table className="shad-table border border-light-200 rounded-lg">
                        <TableHeader>
                          <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                            <TableHead>Invoice Number</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="w-full bg-white">
                          {filteredSales.map((sale: SaleWithRelations) => (
                            <TableRow
                              key={sale.sale.id}
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setPrevSelectedSaleId(sale.sale.id);
                                setSearchQuery("");
                                handleSaleSelection(sale.sale.id);
                                // Find and click the hidden SelectItem with this value
                                const selectItem = document.querySelector(
                                  `[data-value="${sale.sale.id}"]`
                                ) as HTMLElement;
                                if (selectItem) {
                                  selectItem.click();
                                }
                              }}
                            >
                              <TableCell>{sale.sale.invoiceNumber}</TableCell>
                              <TableCell>{sale.customer.name}</TableCell>
                              <TableCell className="w-10">
                                {prevSelectedSaleId === sale.sale.id && (
                                  <span className="text-blue-800">
                                    <Check className="h-5 w-5" />
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Hidden select options for form control */}
                      <div className="hidden">
                        {filteredSales.map((sale: SaleWithRelations) => (
                          <SelectItem
                            key={sale.sale.id}
                            value={sale.sale.id}
                            data-value={sale.sale.id}
                          >
                            {sale.sale.invoiceNumber}
                          </SelectItem>
                        ))}
                      </div>
                    </>
                  ) : (
                    <SelectItem value="null" disabled>
                      <div>No sales found</div>
                    </SelectItem>
                  )}
                </CustomFormField>
              </div>
            </div>
            <p className="text-16-medium text-blue-800">Products</p>
            <Table className="shad-table">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>#</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>Qnty Requested</TableHead>
                  <TableHead>Qnty Fulfilled</TableHead>
                  <TableHead>Qnty Supplied</TableHead>
                  <TableHead>Balance Left</TableHead>
                  <TableHead>Confirm Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white text-blue-800">
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No products available for delivery
                    </TableCell>
                  </TableRow>
                )}
                {fields.map((entry, index) => (
                  <TableRow
                    key={`${entry.productId}-${index}`}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productID}</TableCell>
                    <TableCell>{entry.productName}</TableCell>

                    <TableCell>
                      <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                        {formatNumber(String(entry.quantityRequested))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center text-14-medium text-green-600 rounded-md border bg-white px-3 border-dark-700 h-11">
                        {formatNumber(String(entry.fulfilledQuantity || 0))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.NUMBER}
                        control={form.control}
                        name={`products.${index}.quantitySupplied`}
                        label=""
                        placeholder="Qty supplied"
                        onValueChange={(
                          e: React.ChangeEvent<HTMLInputElement>
                        ) =>
                          handleQuantitySuppliedChange(index, e.target.value)
                        }
                        key={`qty-supplied-${form.watch(
                          `products.${index}.quantitySupplied` || ""
                        )}`}
                      />
                    </TableCell>

                    <TableCell>
                      <div
                        className={`flex items-center text-14-medium rounded-md border px-3 h-11 ${
                          calculateEntryBalanceLeft(index) > 0
                            ? "text-orange-600 bg-orange-50 border-orange-400"
                            : "text-green-500 bg-green-50 border-green-400"
                        }`}
                      >
                        {formatNumber(String(calculateEntryBalanceLeft(index)))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <WaybillStockDialog
                        stock={entry.inventoryStock}
                        productID={entry.productID}
                        qntyRequired={form.watch(
                          `products.${index}.quantitySupplied`
                        )}
                        availableInventory={inventoryStock?.filter(
                          (inv: InventoryStockWithRelations) =>
                            inv.product.id === entry.productId &&
                            inv.store.id === form.watch("storeId") &&
                            inv.inventory.quantity > 0
                        )}
                        onSave={(stock) => {
                          form.setValue(
                            `products.${index}.inventoryStock`,
                            stock
                          );
                          form.trigger(`products.${index}.inventoryStock`);

                          // Recalculate supplied quantity based on stock allocation
                          const totalAllocated = stock.reduce(
                            (total, s) => total + s.quantityTaken,
                            0
                          );
                          form.setValue(
                            `products.${index}.quantitySupplied`,
                            totalAllocated
                          );

                          // Recalculate balance
                          const newBalance = calculateEntryBalanceLeft(index);
                          form.setValue(
                            `products.${index}.balanceLeft`,
                            newBalance
                          );
                        }}
                      />
                      {form.formState.errors.products?.[index]
                        ?.inventoryStock && (
                        <p className="text-red-500 text-xs pt-2">
                          {
                            form.formState.errors.products?.[index]
                              ?.inventoryStock.message
                          }
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-row items-center">
                        <span
                          onClick={() => handleDeleteEntry(index)}
                          className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                        >
                          <DeleteIcon className="h-5 w-5" />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {form.formState.errors.products && (
              <p className="shad-error text-xs">
                {form.formState.errors.products.message}
              </p>
            )}
          </div>

          <p className="text-16-medium text-blue-800 pt-4">Delivery Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="deliveryAddress.addressName"
              label="Address Name"
              placeholder="Enter address name"
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="deliveryAddress.email"
              label="Email"
              placeholder="Enter address email"
            />

            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={form.control}
              name="deliveryAddress.phone"
              label="Phone number"
            />

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="deliveryAddress.country"
              label="Country"
              placeholder="Select a country"
              onValueChange={handleCountryChange}
              key={`country-${form.watch("deliveryAddress.country")}`}
            >
              {Country.getAllCountries().map((country) => (
                <SelectItem
                  key={country.isoCode}
                  value={country.isoCode}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                >
                  {country.name}
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="deliveryAddress.state"
              label="State"
              placeholder={
                selectedCountry ? "Select a state" : "Select a country first"
              }
              onValueChange={handleStateChange}
              disabled={!selectedCountry}
              key={`state-${form.watch("deliveryAddress.state")}`}
            >
              {states.map((state) => (
                <SelectItem
                  key={state.isoCode}
                  value={state.isoCode}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                >
                  {state.name}
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="deliveryAddress.city"
              label="City"
              placeholder={
                selectedState ? "Select a city" : "Select a state first"
              }
              onValueChange={(value) => {
                form.setValue("deliveryAddress.city", value);
                form.trigger("deliveryAddress.city");
              }}
              disabled={!selectedState}
              key={`city-${form.watch("deliveryAddress.city")}`}
            >
              {cities.map((city) => (
                <SelectItem
                  key={city.name}
                  value={city.name}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                >
                  {city.name}
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="deliveryAddress.address"
              label="Address"
              placeholder="Enter physical address"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="status"
              label="Waybill Status"
              placeholder="Select status"
              key={`status-select-${form.watch("status") || ""}`}
            >
              {Object.values(DeliveryStatus).map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {status}
                </SelectItem>
              ))}
            </CustomFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="deliveredBy"
              label="Delivered By:"
              placeholder="Enter name"
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="receivedBy"
              label="Received By:"
              placeholder="Enter name"
            />
          </div>

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
              onClick={handleCancel}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
            <SubmitButton
              isLoading={isAddingWaybill || isEditingWaybill}
              className="shad-primary-btn"
            >
              {mode === "create" ? "Create Waybill" : "Update Waybill"}
            </SubmitButton>
          </div>
        </form>
      </Form>
      <CustomerDialog
        mode="add"
        onSubmit={handleAddCustomer}
        open={customerDialogOpen}
        onOpenChange={closeDialog}
      />
      <StoreDialog
        mode="add"
        onSubmit={handleAddStore}
        open={storeDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingStore}
      />
    </>
  );
};

export default WaybillForm;
