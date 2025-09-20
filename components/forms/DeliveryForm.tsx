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
import { useQuery } from "@tanstack/react-query";
import { City, Country, ICity, IState, State } from "country-state-city";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { RefreshCw } from "lucide-react";
import Loading from "../../app/(dashboard)/loading";
import { SelectItem } from "../ui/select";
import { useStores } from "@/hooks/useStores";
import { useCustomers } from "@/hooks/useCustomers";
import CustomerDialog from "../customers/CustomerDialog";
import StoreDialog from "../stores/StoreDialog";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { useSales } from "@/hooks/useSales";
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
}
const DeliveryForm = ({ mode, initialData, sourceSale }: DeliveryFormProps) => {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedSaleId, setPrevSelectedSaleId] = useState<string | null>(
    null
  );
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
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
  const { addDelivery, isAddingDelivery, editDelivery, isEditingDelivery } =
    useDeliveries();

  const router = useRouter();

  // Generate Delivery Reference number
  const {
    data: generatedDeliveryRefNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["delivery-ref-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateDeliveryRefNumber();
      return result;
    },
    enabled: mode === "create",
  });

  // Default values
  const defaultValues = useMemo(
    () => ({
      deliveryDate: new Date(),
      deliveryRefNumber: generatedDeliveryRefNumber || "",
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
    [generatedDeliveryRefNumber]
  );
  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(DeliveryFormValidation),
    mode: "all",
    defaultValues: initialData
      ? {
          deliveryDate: initialData.delivery.deliveryDate
            ? new Date(initialData.delivery.deliveryDate)
            : new Date(),
          deliveryRefNumber: initialData.delivery.deliveryRefNumber || "",
          status: initialData.delivery.status || DeliveryStatus.Pending,
          deliveryAddress: {
            addressName: initialData.delivery.deliveryAddress.addressName || "",
            address: initialData.delivery.deliveryAddress.address || "",
            city: initialData.delivery.deliveryAddress.city || "",
            state: initialData.delivery.deliveryAddress.state || "",
            country: initialData.delivery.deliveryAddress.country || "",
            email: initialData.delivery.deliveryAddress.email || "",
            phone: initialData.delivery.deliveryAddress.phone || "",
          },
          customerId: initialData.customer.id || "",
          storeId: initialData.store.id || "",
          saleId: initialData.delivery.saleId || "",
          notes: initialData.delivery.notes || "",
          deliveredBy: initialData.delivery.deliveredBy || "",
          receivedBy: initialData.delivery.receivedBy || "",
          products: initialData.products.map((product) => ({
            deliveryId: product.deliveryId,
            productId: product.productId,
            quantityRequested: product.quantityRequested,
            quantitySupplied: product.quantitySupplied,
            balanceLeft: product.balanceLeft,
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

  const filteredSales = sales?.filter((sale: SaleWithRelations) => {
    if (mode === "edit") {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return sale.sale.invoiceNumber?.toLowerCase().includes(query);
    }

    if (!searchQuery.trim()) return !sale.sale.isDeliveryNoteCreated;

    const query = searchQuery.toLowerCase().trim();
    return (
      sale.sale.invoiceNumber?.toLowerCase().includes(query) &&
      !sale.sale.isDeliveryNoteCreated
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

    if (selectedSale.products.length > 0) {
      selectedSale.products.forEach((product: SaleItem) => {
        const suppliedQty = product.inventoryStock.reduce(
          (total, stock) => total + stock.quantityToTake,
          0
        );

        append({
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
      const deliveryAddress = initialData.delivery.deliveryAddress;

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
      }, 100);
    } else if (sourceSale) {
      const { sale, customer, products } = sourceSale;

      const deliveryProducts = products?.map((product: SaleItem) => {
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
      form.setValue("products", deliveryProducts);
    }
  }, [
    initialData,
    form,
    stores,
    remove,
    append,
    defaultValues,
    sourceSale,
    generatedDeliveryRefNumber,
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

  // Set delivery ref number
  useEffect(() => {
    if (generatedDeliveryRefNumber && mode === "create") {
      form.setValue("deliveryRefNumber", generatedDeliveryRefNumber);
    }
  }, [form, mode, generatedDeliveryRefNumber]);

  // Update the refresh button handler (deliveryRefNumber)
  const handleRefreshDeliveryRefNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedDeliveryRefNumber) {
          form.setValue("deliveryRefNumber", generatedDeliveryRefNumber);
        }
      } catch (error) {
        console.error("Error refreshing delivery ref number:", error);
        toast.error("Failed to refresh delivery ref number");
      }
    }
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
      const saleHasDelivery = sales.find(
        (sale: SaleWithRelations) =>
          sale.sale.id === values.saleId && sale.delivery && sale.delivery.id
      );

      if (saleHasDelivery) {
        toast.error("This sale already has a delivery note");
        return;
      }

      if (mode === "create") {
        await addDelivery(
          { data: values },
          {
            onSuccess: () => {
              toast.success("Delivery created successfully!");
              form.reset();
              router.push("/deliveries");
            },
            onError: (error) => {
              console.error("Create delivery error:", error);
              toast.error("Failed to create delivery");
            },
          }
        );
      } else if (mode === "edit") {
        if (!initialData?.delivery.id) {
          toast.error("Delivery ID is required for editing");
          return;
        }
        await editDelivery(
          { id: initialData.delivery.id, data: values },
          {
            onSuccess: () => {
              toast.success("Delivery updated successfully!");
              form.reset();
              router.push("/deliveries");
            },
            onError: (error) => {
              console.error("Edit delivery error:", error);
              toast.error("Failed to update delivery");
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
                  isLoading || isRefetching
                    ? "Generating..."
                    : "Enter delivery reference number"
                }
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshDeliveryRefNumber}
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
              name="deliveryDate"
              label="Delivery Date"
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
                  key={`sale-select-${form.watch("saleId") || ""}`}
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
              label="Delivery Status"
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
            placeholder="Enter delivery notes"
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
              isLoading={isAddingDelivery || isEditingDelivery}
              className="shad-primary-btn"
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
