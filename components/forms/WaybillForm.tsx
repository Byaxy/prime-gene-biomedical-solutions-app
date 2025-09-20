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
  Product,
  ProductWithRelations,
  SaleItem,
  SaleWithRelations,
  Store,
  WaybillConversionStatus,
  WaybillInventoryStock,
  WaybillItem,
  WaybillType,
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
import Loading from "../../app/(dashboard)/loading";
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
import { cn, formatNumber } from "@/lib/utils";
import SubmitButton from "../SubmitButton";
import CustomerDialog from "../customers/CustomerDialog";
import StoreDialog from "../stores/StoreDialog";
import WaybillStockDialog from "../waybills/WaybillStockDialog";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import WaybillInventoryStockSelectDialog from "../waybills/WaybillInventoryStockSelectDialog";
import LoanWaybillsDialog from "../waybills/LoanWaybillsDialog";

interface WaybillFormProps {
  mode: "create" | "edit";
  initialData?: WaybillWithRelations;
  sourceSale?: SaleWithRelations;
}

const WaybillForm = ({ mode, initialData, sourceSale }: WaybillFormProps) => {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [loanWaybillDialogOpen, setLoanWaybillDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customerMatchingLoanWaybills, setCustomerMatchingLoanWaybills] =
    useState<WaybillWithRelations[] | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleWithRelations | null>(
    null
  );
  const [prevSelectedSaleId, setPrevSelectedSaleId] = useState<string | null>(
    null
  );
  const [prevSelectedProductId, setPrevSelectedProductId] = useState<
    string | null
  >(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<
    number | null
  >(null);
  const [states, setStates] = useState<IState[]>(() =>
    initialData?.waybill.deliveryAddress
      ? State.getStatesOfCountry(initialData?.waybill.deliveryAddress?.country)
      : []
  );
  const [cities, setCities] = useState<ICity[]>(() =>
    initialData?.waybill.deliveryAddress
      ? City.getCitiesOfState(
          initialData?.waybill.deliveryAddress?.country || "",
          initialData?.waybill.deliveryAddress?.state
        )
      : []
  );

  const { user } = useAuth();

  const { products, isLoading: productsLoading } = useProducts({
    getAllActive: true,
  });

  const { waybills } = useWaybills({
    getAllWaybills: true,
  });

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
      isLoanWaybill: false,
      isConverted: false,
      conversionDate: undefined,
      conversionStatus: WaybillConversionStatus.Partial,
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
          isLoanWaybill:
            initialData.waybill.waybillType === WaybillType.Loan || false,
          isConverted: initialData.waybill.isConverted || false,
          notes: initialData.waybill.notes || "",
          deliveredBy: initialData.waybill.deliveredBy || "",
          receivedBy: initialData.waybill.receivedBy || "",
          products: initialData.products.map((product) => ({
            productId: product.productId,
            saleItemId: product.saleItemId || "",
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
            quantityConverted: product.quantityConverted,
            productName: product.productName || "",
            productID: product.productID || "",
          })),
        }
      : defaultValues,
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const isLoanWaybill = form.watch("isLoanWaybill");
  const selectedStoreId = form.watch("storeId");
  const selectedProductId = form.watch("selectedProductId");
  const selectedCountry = form.watch("deliveryAddress.country");
  const selectedState = form.watch("deliveryAddress.state");

  // helper function to check if sale has deliverable products
  const hasDeliverableProducts = (sale: SaleWithRelations): boolean => {
    if (!sale?.products?.length || !inventoryStock?.length) {
      return false;
    }

    return sale.products.reduce((hasDeliverable: boolean, product) => {
      if (hasDeliverable) return true;

      if (
        !product?.productId ||
        !product.productID ||
        !product?.storeId ||
        typeof product.fulfilledQuantity !== "number" ||
        typeof product.quantity !== "number"
      ) {
        return false;
      }

      const hasUnfulfilledQuantity =
        product.fulfilledQuantity < product.quantity;
      if (!hasUnfulfilledQuantity) return false;

      // Check if there's available inventory using reduce
      const hasAvailableInventory = inventoryStock.reduce(
        (hasStock: boolean, inv: InventoryStockWithRelations) => {
          if (hasStock) return true;

          // Validate inventory structure
          if (
            !inv?.product?.id ||
            !inv?.product?.productID ||
            !inv?.store?.id ||
            !inv?.inventory?.quantity
          ) {
            return false;
          }

          // Check if inventory matches product and has positive quantity
          return (
            inv.product.id === product.productId &&
            inv.product.productID === product.productID &&
            inv.store.id === product.storeId &&
            inv.inventory.quantity > 0
          );
        },
        false
      );

      return hasAvailableInventory;
    }, false);
  };

  const filteredProducts = products
    ?.reduce((acc: Product[], product: ProductWithRelations) => {
      if (
        !selectedStoreId ||
        !product?.product?.id ||
        !product?.product?.productID
      ) {
        return acc;
      }

      const { product: pdt } = product;

      const productQnty =
        inventoryStock?.reduce(
          (total: number, inv: InventoryStockWithRelations) => {
            if (
              !inv?.product?.id ||
              !inv?.inventory?.quantity ||
              !inv?.store?.id
            ) {
              return total;
            }

            if (
              inv.product.id === pdt.id &&
              inv.product.productID === pdt.productID &&
              inv.store.id === selectedStoreId &&
              inv.inventory.quantity > 0
            ) {
              return total + inv.inventory.quantity;
            }

            return total;
          },
          0
        ) || 0;

      const updatedProduct = { ...pdt, quantity: productQnty };

      // Apply search filter
      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          updatedProduct.productID?.toLowerCase().includes(query) ||
          updatedProduct.name?.toLowerCase().includes(query);

        if (!matchesSearch) return acc;
      }

      acc.push(updatedProduct);
      return acc;
    }, [])
    .filter((pdt: Product) => pdt.quantity > 0);

  // Filter sales
  const filteredSales =
    sales?.reduce((acc: SaleWithRelations[], sale: SaleWithRelations) => {
      if (!sale?.sale || !sale?.products) {
        return acc;
      }

      if (mode === "edit") {
        acc.push(sale);
        return acc;
      }

      const isDeliverable = hasDeliverableProducts(sale);
      if (!isDeliverable) {
        return acc;
      }

      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          sale.sale.invoiceNumber?.toLowerCase().includes(query) || false;

        if (matchesSearch) {
          acc.push(sale);
        }
      } else {
        acc.push(sale);
      }

      return acc;
    }, []) || [];

  // Handle sale selection.
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
    setCustomerMatchingLoanWaybills(null);
    setSelectedSale(selectedSale);

    const matchingLoanWaybills: WaybillWithRelations[] = [];
    const customerLoanWaybills =
      waybills?.reduce(
        (acc: WaybillWithRelations[], waybill: WaybillWithRelations) => {
          if (!waybill.waybill?.waybillType || !waybill?.waybill?.customerId) {
            return acc;
          }

          const isLoanWaybill = waybill.waybill.waybillType === "loan";
          const isNotConverted = waybill.waybill.isConverted === false;
          const hasNoSaleId =
            !waybill.waybill.saleId ||
            waybill.waybill.saleId === null ||
            waybill.waybill.saleId === undefined;
          const isForSelectedCustomer =
            waybill.waybill.customerId === selectedSale.customer.id;

          if (
            isLoanWaybill &&
            isNotConverted &&
            hasNoSaleId &&
            isForSelectedCustomer
          ) {
            acc.push(waybill);
          }

          return acc;
        },
        []
      ) || [];

    if (customerLoanWaybills.length > 0 && selectedSale.products.length > 0) {
      customerLoanWaybills.forEach((loanWaybill: WaybillWithRelations) => {
        // Check if ANY loan waybill product is present in sale products
        const hasMatchingProduct = loanWaybill.products.some(
          (loanProduct: WaybillItem) => {
            return selectedSale.products.some(
              (saleProduct: SaleItem) =>
                saleProduct.productId === loanProduct.productId &&
                saleProduct.productID === loanProduct.productID &&
                loanProduct.quantitySupplied > loanProduct.quantityConverted
            );
          }
        );

        // Add the waybill if it has at least one matching product
        if (hasMatchingProduct) {
          matchingLoanWaybills.push(loanWaybill);
        }
      });
    }

    if (matchingLoanWaybills.length > 0) {
      setCustomerMatchingLoanWaybills(matchingLoanWaybills);
    }

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
            prepend({
              productId: product.productId,
              saleItemId: product.id,
              inventoryStock: allocatedStock,
              quantityRequested: product.quantity,
              quantitySupplied: actualSuppliedQuantity,
              balanceLeft: balanceLeft,
              fulfilledQuantity: product.fulfilledQuantity,
              quantityConverted: 0,
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
          isLoanWaybill:
            initialData.waybill.waybillType === WaybillType.Loan || false,
          isConverted: initialData.waybill.isConverted || false,
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
            prepend({
              productId: product.productId,
              saleItemId: product.saleItemId || "",
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
              quantityConverted: product.quantityConverted || 0,
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

      setCustomerMatchingLoanWaybills(null);

      const matchingLoanWaybills: WaybillWithRelations[] = [];
      const customerLoanWaybills =
        waybills?.reduce(
          (acc: WaybillWithRelations[], waybill: WaybillWithRelations) => {
            if (
              !waybill.waybill?.waybillType ||
              !waybill?.waybill?.customerId
            ) {
              return acc;
            }

            const isLoanWaybill = waybill.waybill.waybillType === "loan";
            const isNotConverted = waybill.waybill.isConverted === false;
            const hasNoSaleId =
              !waybill.waybill.saleId ||
              waybill.waybill.saleId === null ||
              waybill.waybill.saleId === undefined;
            const isForSelectedCustomer =
              waybill.waybill.customerId === customer.id;

            if (
              isLoanWaybill &&
              isNotConverted &&
              hasNoSaleId &&
              isForSelectedCustomer
            ) {
              acc.push(waybill);
            }

            return acc;
          },
          []
        ) || [];

      if (customerLoanWaybills.length > 0 && products.length > 0) {
        customerLoanWaybills.forEach((loanWaybill: WaybillWithRelations) => {
          // Check if ANY loan waybill product is present in sale products
          const hasMatchingProduct = loanWaybill.products.some(
            (loanProduct: WaybillItem) => {
              return products.some(
                (saleProduct: SaleItem) =>
                  saleProduct.productId === loanProduct.productId &&
                  saleProduct.productID === loanProduct.productID &&
                  loanProduct.quantitySupplied > loanProduct.quantityConverted
              );
            }
          );

          // Add the waybill if it has at least one matching product
          if (hasMatchingProduct) {
            matchingLoanWaybills.push(loanWaybill);
          }
        });
      }

      if (matchingLoanWaybills.length > 0) {
        setCustomerMatchingLoanWaybills(matchingLoanWaybills);
      }

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
            prepend({
              productId: product.productId,
              saleItemId: product.id,
              inventoryStock: allocatedStock,
              quantityRequested: product.quantity,
              quantitySupplied: actualSuppliedQuantity,
              balanceLeft: balanceLeft,
              fulfilledQuantity: product.fulfilledQuantity,
              quantityConverted: 0,
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
    prepend,
    defaultValues,
    sourceSale,
    generatedWaybillRefNumber,
    inventoryStock,
    waybills,
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

  // Handle add product
  const handleAddProduct = () => {
    if (!selectedProductId || !selectedStoreId) {
      toast.error("Please select a store and Inventory");
      return;
    }

    const selectedProduct = products?.find(
      (product: ProductWithRelations) =>
        product.product.id === selectedProductId
    );

    if (!selectedProduct) {
      toast.error("Selected product not found");
      return;
    }

    if (fields.some((entry) => entry.productId === selectedProductId)) {
      toast.error("This product is already added");
      return;
    }

    prepend({
      productId: selectedProduct.product.id,
      saleItemId: "",
      inventoryStock: [],
      quantityRequested: 0,
      quantitySupplied: 0,
      balanceLeft: 0,
      fulfilledQuantity: 0,
      quantityConverted: 0,
      productID: selectedProduct.product.productID,
      productName: selectedProduct.product.name,
    });
    form.setValue("selectedProductId", "");
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
    setLoanWaybillDialogOpen(false);

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
              router.push("/waybills");
              toast.success("Waybill created successfully!");
              form.reset();
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

  // get entry inventory stocks based on selected product and store
  const getEntryInventoryStocks = useCallback(
    (productId: string) => {
      return (
        inventoryStock
          ?.filter((stock: InventoryStockWithRelations) => {
            if (!selectedStoreId) return false;
            return (
              stock.product.id === productId &&
              stock.store.id === selectedStoreId &&
              stock.inventory.quantity > 0
            );
          })
          .sort(
            (
              a: InventoryStockWithRelations,
              b: InventoryStockWithRelations
            ) => {
              const aExpiry: number = a.inventory.expiryDate
                ? new Date(a.inventory.expiryDate).getTime()
                : Infinity;
              const bExpiry: number = b.inventory.expiryDate
                ? new Date(b.inventory.expiryDate).getTime()
                : Infinity;
              return aExpiry - bExpiry;
            }
          ) || []
      );
    },
    [inventoryStock, selectedStoreId]
  );

  // handle suppliedQuantity change
  const handleQuantitySuppliedChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;

    if (validateQuantitySupplied(index, numValue)) {
      form.setValue(`products.${index}.quantitySupplied`, numValue);

      const balanceLeft = calculateEntryBalanceLeft(index);
      form.setValue(`products.${index}.balanceLeft`, balanceLeft);
    }
  };

  // handle switch toggle
  const handleSwitchToggle = () => {
    form.setValue("saleId", "");
    form.setValue("storeId", "");
    form.setValue("customerId", "");
    form.setValue("products", []);
    form.setValue("deliveryAddress", {
      addressName: "",
      address: "",
      city: "",
      state: "",
      country: "",
      email: "",
      phone: "",
    });
  };

  useEffect(() => {
    if (isLoanWaybill) {
      const customerId = form.watch("customerId");
      if (customerId) {
        const customer = customers?.find(
          (cust: Customer) => cust.id === customerId
        );
        if (customer) {
          form.setValue("deliveryAddress", {
            addressName: customer.address.addressName || "",
            address: customer.address.address || "",
            city: customer.address.city || "",
            state: customer.address.state || "",
            country: customer.address.country || "",
            email: customer.email || "",
            phone: customer.phone || "",
          });
        }
      }
    }
  }, [customers, form, isLoanWaybill]);

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
          {!sourceSale && (
            <div className="w-full py-5">
              <CustomFormField
                fieldType={FormFieldType.SWITCH}
                control={form.control}
                onValueChange={handleSwitchToggle}
                name="isLoanWaybill"
                label="Is this a Loan Waybill ?"
              />
            </div>
          )}
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
              disabled={!isLoanWaybill}
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
              disabled={!isLoanWaybill}
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
            {isLoanWaybill ? (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name="selectedProductId"
                      label="Select Inventory"
                      placeholder={
                        productsLoading
                          ? "Loading..."
                          : selectedStoreId
                          ? "Select inventory"
                          : "Select store first"
                      }
                      disabled={!selectedStoreId}
                      key={`inventory-select-${selectedProductId || ""}`}
                    >
                      <div className="py-3">
                        <div className="relative flex items-center rounded-md border border-dark-700 bg-white">
                          <Search className="ml-2 h-4 w-4 opacity-50" />
                          <Input
                            type="text"
                            placeholder="Search by Product ID, Product Name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                            disabled={!selectedStoreId || productsLoading}
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
                      {productsLoading ? (
                        <div className="py-4">
                          <Loading />
                        </div>
                      ) : filteredProducts && filteredProducts.length > 0 ? (
                        <>
                          <Table className="shad-table border border-light-200 rounded-lg">
                            <TableHeader>
                              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                                <TableHead>Product ID</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Qnty</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="w-full bg-white">
                              {filteredProducts.map(
                                (product: Product, index: number) => (
                                  <TableRow
                                    key={product.id}
                                    className={cn("cursor-pointer", {
                                      "bg-blue-50": index % 2 === 1,
                                    })}
                                    onClick={() => {
                                      form.setValue(
                                        "selectedProductId",
                                        product.id
                                      );
                                      setPrevSelectedProductId(product.id);
                                      setSearchQuery("");
                                      // Find and click the hidden SelectItem with this value
                                      const selectItem = document.querySelector(
                                        `[data-value="${product.id}"]`
                                      ) as HTMLElement;
                                      if (selectItem) {
                                        selectItem.click();
                                      }
                                    }}
                                  >
                                    <TableCell>{product.productID}</TableCell>
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell>{product.quantity}</TableCell>
                                    <TableCell className="w-10">
                                      {prevSelectedProductId === product.id && (
                                        <span className="text-blue-800">
                                          <Check className="h-5 w-5" />
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                          {/* Hidden select options for form control */}
                          <div className="hidden">
                            {filteredProducts.map((product: Product) => (
                              <SelectItem
                                key={product.id}
                                value={product.id}
                                data-value={product.id}
                              >
                                {product.productID} -{product.name}
                                {}
                              </SelectItem>
                            ))}
                          </div>
                        </>
                      ) : (
                        <SelectItem value="null" disabled>
                          {selectedStoreId ? (
                            <div>No inventory found for this store</div>
                          ) : (
                            <div>Please select a store first</div>
                          )}
                        </SelectItem>
                      )}
                    </CustomFormField>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedProductId}
                    className="self-end shad-primary-btn h-11"
                  >
                    Add Inventory
                  </Button>
                </div>

                <Table className="shad-table">
                  <TableHeader>
                    <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                      <TableHead>#</TableHead>
                      <TableHead>PID</TableHead>
                      <TableHead>Product Description</TableHead>
                      <TableHead className="!max-w-60">Lot Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="w-full bg-white text-blue-800">
                    {fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-4">
                          No products added
                        </TableCell>
                      </TableRow>
                    )}
                    {fields.map((entry, index) => {
                      const entryStock = form.watch(
                        `products.${index}.inventoryStock`
                      );
                      const entryQntyRequested = form.watch(
                        `products.${index}.quantityRequested`
                      );

                      return (
                        <TableRow
                          key={`${entry.productId}-${index}`}
                          className={`w-full ${
                            index % 2 === 1 ? "bg-blue-50" : ""
                          }`}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{entry.productID}</TableCell>
                          <TableCell>{entry.productName}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedProductIndex(index)}
                              disabled={
                                form.watch(
                                  `products.${index}.quantityRequested`
                                ) <= 0
                              }
                              type="button"
                              className={cn(
                                "text-white border-0",
                                entryQntyRequested > 0 &&
                                  entryStock.reduce(
                                    (acc, stock) => acc + stock.quantityTaken,
                                    0
                                  ) === entryQntyRequested
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              )}
                              title="Manage Lot Numbers / Inventory stock"
                            >
                              {form.watch(
                                `products.${index}.quantityRequested`
                              ) <= 0
                                ? "Add Qnty first"
                                : "Manage Lots"}
                            </Button>
                            <WaybillInventoryStockSelectDialog
                              open={selectedProductIndex === index}
                              onOpenChange={(open) =>
                                setSelectedProductIndex(open ? index : null)
                              }
                              productID={entry.productID}
                              requiredQuantity={form.watch(
                                `products.${index}.quantityRequested`
                              )}
                              availableStocks={getEntryInventoryStocks(
                                entry.productId
                              )}
                              selectedInventoryStock={entry.inventoryStock}
                              onSave={(stock) => {
                                const quantityRequested = form.watch(
                                  `products.${index}.quantityRequested`
                                );
                                const quantitySupplied = stock.reduce(
                                  (qnty, s) => qnty + s.quantityTaken,
                                  0
                                );
                                if (quantityRequested !== quantitySupplied) {
                                  form.setError(
                                    `products.${index}.quantitySupplied`,
                                    {
                                      message:
                                        "Total allocated quantity must match supplied quantity",
                                    }
                                  );
                                }
                                form.setValue(
                                  `products.${index}.inventoryStock`,
                                  stock
                                );
                                form.setValue(
                                  `products.${index}.quantitySupplied`,
                                  quantitySupplied
                                );
                                form.setValue(
                                  `products.${index}.fulfilledQuantity`,
                                  quantitySupplied
                                );
                                form.trigger(
                                  `products.${index}.inventoryStock`
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
                            <CustomFormField
                              fieldType={FormFieldType.NUMBER}
                              control={form.control}
                              name={`products.${index}.quantityRequested`}
                              label=""
                              placeholder="Qnty"
                            />
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
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            ) : (
              <>
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="w-full">
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name="saleId"
                      label="Select Sale"
                      placeholder={`${
                        salesLoading ? "Loading..." : "Select sale"
                      }`}
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
                            disabled={
                              salesLoading || filteredSales?.length === 0
                            }
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
                                  <TableCell>
                                    {sale.sale.invoiceNumber}
                                  </TableCell>
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
                          <div className="text-red-600">
                            No sales with deliverable products
                          </div>
                        </SelectItem>
                      )}
                    </CustomFormField>
                  </div>
                </div>

                {customerMatchingLoanWaybills &&
                  customerMatchingLoanWaybills?.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 bg-red-600/10 p-5 rounded-md border border-red-600 text-center">
                      <Button
                        type="button"
                        className="shad-danger-btn w-fit"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLoanWaybillDialogOpen(true);
                        }}
                      >
                        View Matching Loan waybills
                      </Button>
                      <p className="text-red-600 text-sm">
                        ⚠️ Matching loan waybills found for this cutomer
                      </p>
                    </div>
                  )}
                <Table className="shad-table">
                  <TableHeader>
                    <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                      <TableHead>#</TableHead>
                      <TableHead>PID</TableHead>
                      <TableHead>Product Description</TableHead>
                      <TableHead>Qnty Requested</TableHead>
                      <TableHead>Qnty Fulfilled</TableHead>
                      <TableHead>Qnty to Supply</TableHead>
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
                    {fields.map((entry, index) => {
                      const entryStock = form.watch(
                        `products.${index}.inventoryStock`
                      );

                      const entryQntySupplied = form.watch(
                        `products.${index}.quantitySupplied`
                      );
                      return (
                        <TableRow
                          key={`${entry.productId}-${index}`}
                          className={`w-full ${
                            index % 2 === 1 ? "bg-blue-50" : ""
                          }`}
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
                              {formatNumber(
                                String(entry.fulfilledQuantity || 0)
                              )}
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
                                handleQuantitySuppliedChange(
                                  index,
                                  e.target.value
                                )
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
                              {formatNumber(
                                String(calculateEntryBalanceLeft(index))
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <WaybillStockDialog
                              stock={entry.inventoryStock}
                              productID={entry.productID}
                              qntyRequired={form.watch(
                                `products.${index}.quantitySupplied`
                              )}
                              className={`
                                text-white border-0 ${
                                  entryQntySupplied > 0 &&
                                  entryStock.reduce(
                                    (acc, stock) => acc + stock.quantityTaken,
                                    0
                                  ) === entryQntySupplied
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }
                                `}
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
                                form.trigger(
                                  `products.${index}.inventoryStock`
                                );

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
                                const newBalance =
                                  calculateEntryBalanceLeft(index);
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
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}

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
      {(selectedSale || sourceSale) && (
        <LoanWaybillsDialog
          open={loanWaybillDialogOpen}
          onOpenChange={closeDialog}
          waybills={customerMatchingLoanWaybills || []}
          sale={selectedSale || (sourceSale as SaleWithRelations)}
        />
      )}
    </>
  );
};

export default WaybillForm;
