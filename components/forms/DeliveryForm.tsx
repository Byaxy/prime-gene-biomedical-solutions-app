"use client";

import { generateDeliveryRefNumber } from "@/lib/actions/delivery.actions";
import {
  CustomerFormValues,
  DeliveryFormValidation,
  DeliveryFormValues,
  StoreFormValues,
} from "@/lib/validation";
import {
  Customer,
  DeliveryStatus,
  DeliveryWithRelations,
  SaleItem,
  SaleWithRelations,
  Store,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { City, Country, ICity, IState, State } from "country-state-city";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { RefreshCw } from "lucide-react";
import { SelectItem } from "../ui/select";
import { useStores } from "@/hooks/useStores";
import { useCustomers } from "@/hooks/useCustomers";
import CustomerDialog from "../customers/CustomerDialog";
import StoreDialog from "../stores/StoreDialog";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Check } from "lucide-react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
interface DeliveryFormProps {
  mode: "create" | "edit";
  initialData?: DeliveryWithRelations;
  sourceSale?: SaleWithRelations;
  deliveries: DeliveryWithRelations[];
  customers: Customer[];
  stores: Store[];
  sales: SaleWithRelations[];
  generatedDeliveryRefNumber?: string;
}

const DeliveryForm = ({
  mode,
  initialData,
  sourceSale,
  deliveries,
  customers,
  stores,
  sales,
  generatedDeliveryRefNumber: initialGeneratedDeliveryRefNumber,
}: DeliveryFormProps) => {
  const [isRefetchingDeliveryRefNumber, setIsRefetchingDeliveryRefNumber] =
    useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedSaleId, setPrevSelectedSaleId] = useState<string | null>(
    null
  );
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const { addStore, isAddingStore } = useStores({
    getAllStores: true,
  });
  const { addCustomer, isAddingCustomer } = useCustomers({
    getAllCustomers: true,
  });
  const { addDelivery, isAddingDelivery, editDelivery, isEditingDelivery } =
    useDeliveries();

  const router = useRouter();
  const initialMount = useRef(true);

  // Default values
  const defaultValues = useMemo(
    () => ({
      deliveryDate: new Date(),
      deliveryRefNumber: initialGeneratedDeliveryRefNumber || "",
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
    [initialGeneratedDeliveryRefNumber]
  );
  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(DeliveryFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedCountry = form.watch("deliveryAddress.country");
  const selectedState = form.watch("deliveryAddress.state");

  const watchedFields = fields.map((_, index) => ({
    quantitySupplied: form.watch(`products.${index}.quantitySupplied`),
  }));

  const filteredSales = useMemo(() => {
    return sales?.filter((sale: SaleWithRelations) => {
      const hasDeliveryNote = sales.some(
        (existingSale) =>
          existingSale.sale.id === sale.sale.id &&
          existingSale.delivery &&
          existingSale.delivery.id
      );

      if (mode === "edit") {
        const isCurrentDeliverySale =
          initialData?.delivery.saleId === sale.sale.id;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        return (
          sale.sale.invoiceNumber?.toLowerCase().includes(query) &&
          (!hasDeliveryNote || isCurrentDeliverySale)
        );
      }

      if (!searchQuery.trim()) return !hasDeliveryNote;

      const query = searchQuery.toLowerCase().trim();
      return (
        sale.sale.invoiceNumber?.toLowerCase().includes(query) &&
        !hasDeliveryNote
      );
    });
  }, [sales, searchQuery, mode, initialData]);

  // Handle products for selected sale.
  const handleSaleSelection = useCallback(
    (saleId: string) => {
      if (!saleId) {
        toast.error("Please select a Sale");
        return;
      }
      if (!sales || sales.length === 0) {
        toast.error("No sales available");
        return;
      }
      const selectedSale = sales?.find(
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
        selectedSale.sale?.deliveryAddress?.address !== ""
          ? selectedSale.sale.deliveryAddress
          : {
              addressName: selectedSale.customer.address?.addressName || "",
              address: selectedSale.customer.address?.address || "",
              city: selectedSale.customer.address?.city || "",
              state: selectedSale.customer.address?.state || "",
              country: selectedSale.customer.address?.country || "",
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

      if (selectedSale.products.length > 0) {
        selectedSale.products.forEach((product: SaleItem) => {
          const suppliedQty = product.inventoryStock.reduce(
            (total, stock) => total + stock.quantityToTake,
            0
          );

          prepend({
            productId: product.productId,
            quantityRequested: product.quantity,
            quantitySupplied: suppliedQty,
            balanceLeft: product.quantity - suppliedQty,
            productName: product.productName,
            productID: product.productID,
          });
        });
      }

      // Add a small delay to ensure state updates are processed
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
        ]);
      }, 100);
    },
    [sales, form, prepend, remove]
  );

  // Set initial values for the form
  useEffect(() => {
    if (initialMount.current) {
      if (initialData) {
        const deliveryAddress = initialData.delivery.deliveryAddress;

        if (deliveryAddress?.country) {
          setStates(State.getStatesOfCountry(deliveryAddress.country) || []);
          if (deliveryAddress?.state) {
            setCities(
              City.getCitiesOfState(
                deliveryAddress.country,
                deliveryAddress.state
              ) || []
            );
          } else {
            setCities([]);
          }
        } else {
          setStates([]);
          setCities([]);
        }

        form.reset({
          deliveryDate: new Date(
            initialData.delivery.deliveryDate || Date.now()
          ),
          deliveryRefNumber: initialData.delivery.deliveryRefNumber || "",
          status: initialData.delivery.status,
          customerId: initialData.delivery.customerId || "",
          storeId: initialData.delivery.storeId || "",
          saleId: initialData.delivery.saleId || "",
          notes: initialData.delivery.notes || "",
          deliveredBy: initialData.delivery.deliveredBy || "",
          receivedBy: initialData.delivery.receivedBy || "",
          products: initialData.products || [],
          deliveryAddress: {
            addressName:
              initialData.delivery.deliveryAddress?.addressName || "",
            address: initialData.delivery.deliveryAddress?.address || "",
            city: initialData.delivery.deliveryAddress?.city || "",
            state: initialData.delivery.deliveryAddress?.state || "",
            country: initialData.delivery.deliveryAddress?.country || "",
            email: initialData.delivery.deliveryAddress?.email || "",
            phone: initialData.delivery.deliveryAddress?.phone || "",
          },
        });
        setPrevSelectedSaleId(initialData.delivery.saleId);
      } else if (mode === "create" && sourceSale) {
        const { sale, customer, products: saleProducts } = sourceSale;

        const deliveryProducts = saleProducts?.map((product: SaleItem) => {
          const suppliedQnty = product.inventoryStock.reduce(
            (total, stock) => total + stock.quantityToTake,
            0
          );
          return {
            productId: product.productId,
            quantityRequested: product.quantity,
            quantitySupplied: suppliedQnty,
            balanceLeft: product.quantity - suppliedQnty,
            productName: product.productName,
            productID: product.productID,
          };
        });

        const deliveryAddress =
          sale.isDeliveryAddressAdded &&
          sale.deliveryAddress?.address !== "" &&
          sale.deliveryAddress?.addressName !== ""
            ? sale.deliveryAddress
            : {
                addressName: customer.name,
                address: customer.address?.address || "",
                city: customer.address?.city || "",
                state: customer.address?.state || "",
                country: customer.address?.country || "",
                email: customer.email,
                phone: customer.phone,
              };

        if (deliveryAddress?.country) {
          setStates(State.getStatesOfCountry(deliveryAddress.country) || []);
          if (deliveryAddress?.state) {
            setCities(
              City.getCitiesOfState(
                deliveryAddress.country,
                deliveryAddress.state
              ) || []
            );
          } else {
            setCities([]);
          }
        } else {
          setStates([]);
          setCities([]);
        }

        form.reset({
          ...defaultValues,
          deliveryRefNumber:
            initialGeneratedDeliveryRefNumber ||
            defaultValues.deliveryRefNumber,
          customerId: sale.customerId,
          storeId: sale.storeId,
          saleId: sale.id,
          deliveryAddress: {
            addressName: deliveryAddress?.addressName || "",
            address: deliveryAddress?.address || "",
            city: deliveryAddress?.city || "",
            state: deliveryAddress?.state || "",
            country: deliveryAddress?.country || "",
            email: deliveryAddress?.email || "",
            phone: deliveryAddress?.phone || "",
          },
          products: deliveryProducts,
        });
        setPrevSelectedSaleId(sale.id);
      } else if (mode === "create" && initialGeneratedDeliveryRefNumber) {
        form.setValue("deliveryRefNumber", initialGeneratedDeliveryRefNumber);
      }
      initialMount.current = false;
    }
  }, [
    initialData,
    form,
    sourceSale,
    defaultValues,
    mode,
    initialGeneratedDeliveryRefNumber,
  ]);

  useEffect(() => {
    if (selectedCountry) {
      setStates(State.getStatesOfCountry(selectedCountry) || []);
      setCities([]);
    } else {
      setStates([]);
      setCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState && selectedCountry) {
      setCities(City.getCitiesOfState(selectedCountry, selectedState) || []);
    } else {
      setCities([]);
    }
  }, [selectedState, selectedCountry]);

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

  // Update the refresh button handler (deliveryRefNumber)
  const handleRefreshDeliveryRefNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingDeliveryRefNumber(true);
        const newRefNumber = await generateDeliveryRefNumber();
        form.setValue("deliveryRefNumber", newRefNumber);
      } catch (error) {
        console.error("Error refreshing delivery ref number:", error);
        toast.error("Failed to refresh delivery ref number");
      } finally {
        setIsRefetchingDeliveryRefNumber(false);
      }
    }
  };
  // Update the cancel button handler
  const handleCancel = () => {
    if (mode === "create") {
      form.reset(defaultValues);
      form.setValue(
        "deliveryRefNumber",
        initialGeneratedDeliveryRefNumber || ""
      );
    } else {
      if (initialData) {
        form.reset({
          deliveryDate: new Date(
            initialData.delivery.deliveryDate || Date.now()
          ),
          deliveryRefNumber: initialData.delivery.deliveryRefNumber || "",
          status: initialData.delivery.status,
          customerId: initialData.delivery.customerId || "",
          storeId: initialData.delivery.storeId || "",
          saleId: initialData.delivery.saleId || "",
          notes: initialData.delivery.notes || "",
          deliveredBy: initialData.delivery.deliveredBy || "",
          receivedBy: initialData.delivery.receivedBy || "",
          products: initialData.products || [],
          deliveryAddress: {
            addressName:
              initialData.delivery.deliveryAddress?.addressName || "",
            address: initialData.delivery.deliveryAddress?.address || "",
            city: initialData.delivery.deliveryAddress?.city || "",
            state: initialData.delivery.deliveryAddress?.state || "",
            country: initialData.delivery.deliveryAddress?.country || "",
            email: initialData.delivery.deliveryAddress?.email || "",
            phone: initialData.delivery.deliveryAddress?.phone || "",
          },
        });
      } else {
        form.reset(defaultValues);
      }
    }
  };
  // handle close dialog
  const closeDialog = useCallback(() => {
    // Memoized
    setCustomerDialogOpen(false);
    setStoreDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  const validateDeliveryRefNumber = useCallback(
    (deliveryRefNumber: string) => {
      const existingDelivery = deliveries?.find(
        (delivery: DeliveryWithRelations) =>
          delivery.delivery.deliveryRefNumber === deliveryRefNumber
      );
      if (mode === "create" && existingDelivery) return false;

      if (
        mode === "edit" &&
        initialData?.delivery.deliveryRefNumber !== deliveryRefNumber &&
        existingDelivery
      )
        return false;
      return true;
    },
    [deliveries, mode, initialData]
  );

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = form.getValues();

      const saleHasDelivery = sales.find(
        (sale: SaleWithRelations) =>
          sale.sale.id === values.saleId && sale.delivery && sale.delivery.id
      );
      if (mode === "create" && saleHasDelivery) {
        toast.error("This sale already has a delivery note");
        return;
      }

      if (
        mode === "edit" &&
        saleHasDelivery &&
        saleHasDelivery.delivery?.id !== initialData?.delivery.id
      ) {
        toast.error("Another delivery already exists for this sale.");
        return;
      }

      if (!validateDeliveryRefNumber(values.deliveryRefNumber)) {
        toast.error(
          "A Delivery with the same delivery refference number already exists."
        );
        return;
      }

      const loadingToastId = toast.loading(
        mode === "create" ? "Creating delivery..." : "Updating delivery..."
      );

      try {
        if (mode === "create") {
          await addDelivery(
            { data: values },
            {
              onSuccess: () => {
                toast.success("Delivery created successfully!", {
                  id: loadingToastId,
                });
                router.push("/deliveries");
                router.refresh();
                form.reset(defaultValues);
              },
            }
          );
        } else if (mode === "edit") {
          if (!initialData?.delivery.id) {
            throw new Error("Delivery ID is required for editing");
          }
          await editDelivery(
            { id: initialData.delivery.id, data: values },
            {
              onSuccess: () => {
                toast.success("Delivery updated successfully!", {
                  id: loadingToastId,
                });
                router.push("/deliveries");
                router.refresh();
                form.reset(defaultValues);
              },
            }
          );
        }
      } catch (error) {
        console.error("Delivery operation error:", error);
        toast.error(
          `Failed to ${mode === "create" ? "create" : "update"} delivery`,
          { id: loadingToastId }
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
      const entryQntySupplied = form.watch(
        `products.${index}.quantitySupplied`
      );
      const entryQntyRequested =
        form.watch(`products.${index}.quantityRequested`) || 0;
      return entryQntyRequested - entryQntySupplied;
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

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const entryBalanceLeft = calculateEntryBalanceLeft(index);

        form.setValue(`products.${index}.balanceLeft`, entryBalanceLeft);
      });

      console.log("Updated product fields with balance left.");
    }
  }, [watchedFields, fields, form, calculateEntryBalanceLeft]);

  const isAnyMutationLoading =
    isAddingDelivery || isEditingDelivery || isAddingCustomer || isAddingStore;

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
                name="deliveryRefNumber"
                label="Delivery Reference Number"
                placeholder={
                  isAnyMutationLoading
                    ? "Generating..."
                    : "Enter delivery reference number"
                }
                disabled={isAnyMutationLoading || isRefetchingDeliveryRefNumber}
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshDeliveryRefNumber}
                className="self-end shad-primary-btn px-5"
                disabled={isAnyMutationLoading || isRefetchingDeliveryRefNumber}
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    isRefetchingDeliveryRefNumber ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="deliveryDate"
              label="Delivery Date"
              dateFormat="MM/dd/yyyy"
              disabled={isAnyMutationLoading}
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
                  key={`sale-select-${form.watch("saleId") || ""}`}
                  disabled={
                    !!sourceSale || !!initialData || isAnyMutationLoading
                  }
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
                        disabled={isAnyMutationLoading}
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
                  {filteredSales && filteredSales.length > 0 ? (
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
                                if (isAnyMutationLoading) return;
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
                  <TableHead>Qnty Supplied</TableHead>
                  <TableHead>Balance Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white text-blue-800">
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-4">
                      No products
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
                        {entry.quantityRequested}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.NUMBER}
                        control={form.control}
                        name={`products.${index}.quantitySupplied`}
                        label=""
                        placeholder="Qty supplied"
                        disabled={isAnyMutationLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                        {formatNumber(String(calculateEntryBalanceLeft(index)))}
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
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="deliveryAddress.email"
              label="Email"
              placeholder="Enter address email"
              disabled={isAnyMutationLoading}
            />

            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={form.control}
              name="deliveryAddress.phone"
              label="Phone number"
              disabled={isAnyMutationLoading}
            />

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="deliveryAddress.country"
              label="Country"
              placeholder="Select a country"
              onValueChange={handleCountryChange}
              key={`country-${form.watch("deliveryAddress.country")}`}
              disabled={isAnyMutationLoading}
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
              disabled={!selectedCountry || isAnyMutationLoading}
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
              disabled={!selectedState || isAnyMutationLoading}
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
              disabled={isAnyMutationLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="status"
              label="Delivery Status"
              placeholder="Select status"
              key={`status-select-${form.watch("status") || ""}`}
              disabled={isAnyMutationLoading}
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
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="receivedBy"
              label="Received By:"
              placeholder="Enter name"
              disabled={isAnyMutationLoading}
            />
          </div>

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="notes"
            label="Notes"
            placeholder="Enter delivery notes"
            disabled={isAnyMutationLoading}
          />

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={handleCancel}
              className="shad-danger-btn"
              disabled={isAnyMutationLoading}
            >
              Cancel
            </Button>
            <SubmitButton
              isLoading={isAddingDelivery || isEditingDelivery}
              className="shad-primary-btn"
              disabled={isAnyMutationLoading}
            >
              {mode === "create" ? "Create Delivery" : "Update Delivery"}
            </SubmitButton>
          </div>
        </form>{" "}
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

export default DeliveryForm;
