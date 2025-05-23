"use client";

import {
  CustomerFormValues,
  SaleFormValidation,
  SaleFormValues,
  StoreFormValues,
  TaxFormValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import SubmitButton from "../SubmitButton";
import { useCustomers } from "@/hooks/useCustomers";
import FormatNumber from "@/components/FormatNumber";
import { useSales } from "@/hooks/useSales";
import { useRouter } from "next/navigation";
import {
  Attachment,
  Customer,
  InventoryStockWithRelations,
  PaymentMethod,
  PaymentStatus,
  ProductWithRelations,
  QuotationWithRelations,
  SaleStatus,
  SaleWithRelations,
  Store,
  Tax,
} from "@/types";
import CustomerDialog from "../customers/CustomerDialog";
import { useQuery } from "@tanstack/react-query";
import { generateInvoiceNumber } from "@/lib/actions/sale.actions";
import { RefreshCw } from "lucide-react";
import { useTaxes } from "@/hooks/useTaxes";
import TaxDialog from "../taxes/TaxDialog";
import Loading from "../loading";
import { FileUploader } from "../FileUploader";
import ProductSheet from "../products/ProductSheet";
import { Country, State, City } from "country-state-city";
import { IState, ICity } from "country-state-city";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { Check } from "lucide-react";
import { X } from "lucide-react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import StoreDialog from "../stores/StoreDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { formatDateTime, formatNumber } from "@/lib/utils";

interface SaleFormProps {
  mode: "create" | "edit";
  initialData?: SaleWithRelations;
  sourceQuotation?: QuotationWithRelations;
}

const SaleForm = ({ mode, initialData, sourceQuotation }: SaleFormProps) => {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedProductId, setPrevSelectedProductId] = useState<
    string | null
  >(null);

  const { user } = useAuth();

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

  const { products, isLoading: productsLoading } = useProducts({
    getAllProducts: true,
  });
  const { inventoryStock, isLoading: inventoryStockLoading } =
    useInventoryStock({
      getAllInventoryStocks: true,
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
  const {
    taxes,
    isLoading: taxesLoading,
    addTax,
    isAddingTax,
  } = useTaxes({ getAllTaxes: true });
  const { sales, addSale, isAddingSale, editSale, isEditingSale } = useSales({
    getAllSales: true,
  });

  // Generate Sale invoice number
  const {
    data: generatedInvoiceNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["invoice-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateInvoiceNumber();
      return result;
    },
    enabled: mode === "create",
  });

  const router = useRouter();

  // Default values
  const defaultValues = useMemo(
    () => ({
      invoiceNumber: generatedInvoiceNumber || "",
      saleDate: new Date(),
      customerId: sourceQuotation?.quotation.customerId || "",
      storeId: "",
      subTotal: 0,
      totalAmount: 0,
      discountAmount: 0,
      totalTaxAmount: 0,
      amountPaid: 0,
      status: SaleStatus.Pending as SaleStatus,
      paymentMethod: PaymentMethod.Cash as PaymentMethod,
      paymentStatus: PaymentStatus.Pending as PaymentStatus,
      notes: sourceQuotation?.quotation.notes || "",
      products: [],
      quotationId: sourceQuotation?.quotation.id || "",
      attachments: [],
      isDeliveryAddressAdded:
        sourceQuotation?.quotation.isDeliveryAddressAdded || false,
      deliveryAddress: {
        addressName:
          sourceQuotation?.quotation.deliveryAddress?.addressName || "",
        address: sourceQuotation?.quotation.deliveryAddress?.address || "",
        city: sourceQuotation?.quotation.deliveryAddress?.city || "",
        state: sourceQuotation?.quotation.deliveryAddress?.state || "",
        country: sourceQuotation?.quotation.deliveryAddress?.country || "",
        email: sourceQuotation?.quotation.deliveryAddress?.email || "",
        phone: sourceQuotation?.quotation.deliveryAddress?.phone || "",
      },
      selectedProductId: "",
    }),
    [generatedInvoiceNumber, sourceQuotation]
  );

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(SaleFormValidation),
    mode: "all",
    defaultValues: initialData
      ? {
          invoiceNumber: initialData?.sale.invoiceNumber || "",
          saleDate: initialData?.sale.saleDate
            ? new Date(initialData.sale.saleDate)
            : new Date(),
          products:
            initialData?.products?.map((product) => {
              const productInventoryStock = inventoryStock?.find(
                (stock: InventoryStockWithRelations) =>
                  stock.inventory.id === product.inventoryStockId &&
                  stock.inventory.lotNumber === product.lotNumber
              );
              return {
                inventoryStockId: product.inventoryStockId || "",
                productId: product.productId,
                saleId: product.saleId || "",
                storeId: product.storeId || "",
                lotNumber: product.lotNumber,
                quantity: product.quantity,
                availableQuantity: productInventoryStock?.quantity || 0,
                unitPrice: product.unitPrice,
                subTotal: product.subTotal,
                totalPrice: product.totalPrice,
                taxAmount: product.taxAmount,
                taxRate: product.taxRate,
                taxRateId: product.taxRateId || "",
                discountRate: product.discountRate,
                discountAmount: product.discountAmount,
                productID: product.productID,
                productName: product.productName,
              };
            }) || [],
          customerId: initialData?.sale.customerId || "",
          storeId: initialData?.sale.storeId || "",
          status: initialData?.sale.status || SaleStatus.Pending,
          notes: initialData?.sale.notes || "",
          amountPaid: initialData?.sale.amountPaid || 0,
          discountAmount: initialData?.sale.discountAmount || 0,
          totalTaxAmount: initialData?.sale.totalTaxAmount || 0,
          subTotal: initialData?.sale.subTotal || 0,
          totalAmount: initialData?.sale.totalAmount || 0,
          attachments: initialData?.sale.attachments || [],
          isDeliveryAddressAdded:
            initialData?.sale.isDeliveryAddressAdded || false,
          deliveryAddress: {
            addressName: initialData?.sale.deliveryAddress?.addressName || "",
            address: initialData?.sale.deliveryAddress?.address || "",
            city: initialData?.sale.deliveryAddress?.city || "",
            state: initialData?.sale.deliveryAddress?.state || "",
            country: initialData?.sale.deliveryAddress?.country || "",
            email: initialData?.sale.deliveryAddress?.email || "",
            phone: initialData?.sale.deliveryAddress?.phone || "",
          },
          paymentMethod: initialData?.sale.paymentMethod || PaymentMethod.Cash,
          paymentStatus:
            initialData?.sale.paymentStatus || PaymentStatus.Pending,
          quotationId: initialData?.sale.quotationId || "",
          selectedProductId: "",
        }
      : defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedStoreId = form.watch("storeId");
  const selectedProductId = form.watch("selectedProductId");
  const isDeliveryAddressAdded = form.watch("isDeliveryAddressAdded");
  const selectedCountry = form.watch("deliveryAddress.country");
  const selectedState = form.watch("deliveryAddress.state");

  const watchedFields = fields.map((_, index) => ({
    quantity: form.watch(`products.${index}.quantity`),
    unitPrice: form.watch(`products.${index}.unitPrice`),
    taxRateId: form.watch(`products.${index}.taxRateId`),
    discountRate: form.watch(`products.${index}.discountRate`),
    lotNumber: form.watch(`products.${index}.lotNumber`),
    availableQuantity: form.watch(`products.${index}.availableQuantity`),
  }));

  const filteredProducts = products?.filter((product: ProductWithRelations) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      product.product.productID?.toLowerCase().includes(query) ||
      product.product.name?.toLowerCase().includes(query)
    );
  });

  // Set initial values for the form
  useEffect(() => {
    // Editing an existing sale
    if (initialData && inventoryStock) {
      if (initialData.sale.deliveryAddress?.country) {
        const countryStates =
          State.getStatesOfCountry(initialData.sale.deliveryAddress.country) ||
          [];
        setStates(countryStates);

        if (initialData.sale.deliveryAddress?.state) {
          const stateCities =
            City.getCitiesOfState(
              initialData.sale.deliveryAddress.country,
              initialData.sale.deliveryAddress.state
            ) || [];
          setCities(stateCities);
        }
      }

      setTimeout(() => {
        const productsWithCurrentAvailableQty = initialData.products.map(
          (product) => {
            let currentAvailableQuantity = 0;

            if (product.inventoryStockId) {
              const currentStock = inventoryStock.find(
                (stock: InventoryStockWithRelations) =>
                  stock.inventory.id === product.inventoryStockId
              );

              if (currentStock) {
                currentAvailableQuantity = currentStock.inventory.quantity;
              }
            }

            return {
              inventoryStockId: product.inventoryStockId,
              productId: product.productId,
              saleId: product.saleId,
              storeId: product.storeId,
              lotNumber: product.lotNumber,
              availableQuantity: currentAvailableQuantity,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              subTotal: product.subTotal,
              totalPrice: product.totalPrice,
              taxAmount: product.taxAmount,
              taxRate: product.taxRate,
              taxRateId: product.taxRateId,
              discountRate: product.discountRate,
              discountAmount: product.discountAmount,
              productID: product.productID,
              productName: product.productName,
            };
          }
        );

        form.reset({
          invoiceNumber: initialData.sale.invoiceNumber,
          saleDate: new Date(initialData.sale.saleDate || Date.now()),
          products: productsWithCurrentAvailableQty,
          customerId: initialData.sale.customerId,
          storeId: initialData?.sale.storeId || "",
          status: initialData.sale.status,
          notes: initialData.sale.notes || "",
          amountPaid: initialData.sale.amountPaid,
          discountAmount: initialData.sale.discountAmount || 0,
          totalTaxAmount: initialData.sale.totalTaxAmount || 0,
          subTotal: initialData.sale.subTotal || 0,
          totalAmount: initialData.sale.totalAmount || 0,
          attachments: initialData.sale.attachments || [],
          isDeliveryAddressAdded:
            initialData.sale.isDeliveryAddressAdded || false,
          deliveryAddress: {
            addressName: initialData.sale.deliveryAddress?.addressName || "",
            address: initialData.sale.deliveryAddress?.address || "",
            city: initialData.sale.deliveryAddress?.city || "",
            state: initialData.sale.deliveryAddress?.state || "",
            country: initialData.sale.deliveryAddress?.country || "",
            email: initialData.sale.deliveryAddress?.email || "",
            phone: initialData.sale.deliveryAddress?.phone || "",
          },
          paymentMethod: initialData?.sale.paymentMethod || PaymentMethod.Cash,
          paymentStatus:
            initialData?.sale.paymentStatus || PaymentStatus.Pending,
          quotationId: initialData?.sale.quotationId || "",
          selectedProductId: "",
        });
      }, 100);
    }
    // Creating from a quotation
    else if (sourceQuotation && stores && stores.length > 0) {
      // Set the first store by default
      const firstStoreId = stores[0].id;
      form.setValue("storeId", firstStoreId);
      form.setValue("quotationId", sourceQuotation.quotation.id);
      form.setValue("customerId", sourceQuotation.quotation.customerId);
      form.setValue("notes", sourceQuotation.quotation.notes);
      form.setValue("attachments", sourceQuotation.quotation.attachments || []);
      form.setValue(
        "isDeliveryAddressAdded",
        sourceQuotation.quotation.isDeliveryAddressAdded
      );

      if (sourceQuotation.quotation.deliveryAddress) {
        form.setValue("deliveryAddress", {
          addressName:
            sourceQuotation.quotation.deliveryAddress.addressName || "",
          address: sourceQuotation.quotation.deliveryAddress.address || "",
          city: sourceQuotation.quotation.deliveryAddress.city || "",
          state: sourceQuotation.quotation.deliveryAddress.state || "",
          country: sourceQuotation.quotation.deliveryAddress.country || "",
          email: sourceQuotation.quotation.deliveryAddress.email || "",
          phone: sourceQuotation.quotation.deliveryAddress.phone || "",
        });

        // Set states and cities if country/state is provided
        if (sourceQuotation.quotation.deliveryAddress.country) {
          const countryStates =
            State.getStatesOfCountry(
              sourceQuotation.quotation.deliveryAddress.country
            ) || [];
          setStates(countryStates);

          if (sourceQuotation.quotation.deliveryAddress.state) {
            const stateCities =
              City.getCitiesOfState(
                sourceQuotation.quotation.deliveryAddress.country,
                sourceQuotation.quotation.deliveryAddress.state
              ) || [];
            setCities(stateCities);
          }
        }
      }

      const handleAutoPopulateProducts = async () => {
        if (!inventoryStock || !sourceQuotation) return;

        remove();

        // Arrays to collect warning and error messages
        const insufficientStockWarnings: string[] = [];
        const noInventoryWarnings: string[] = [];
        const productNotFoundErrors: string[] = [];

        for (const quotationProduct of sourceQuotation.products) {
          // Find all inventory stocks for this product in the selected store
          const productStocks: InventoryStockWithRelations[] = inventoryStock
            .filter(
              (stock: InventoryStockWithRelations) =>
                stock.store.id === firstStoreId &&
                stock.product.id === quotationProduct.productId
            )
            // Sort by expiry date (soonest first)
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
            );

          let remainingQuantity = quotationProduct.quantity;

          // We have inventory stocks for this product
          if (productStocks.length > 0) {
            for (const stock of productStocks) {
              if (remainingQuantity <= 0) break;
              if (stock.inventory.quantity <= 0) continue;

              const availableQuantity = stock.inventory.quantity;
              const quantityToTake = Math.min(
                availableQuantity,
                remainingQuantity
              );

              append({
                productId: stock.product.id,
                inventoryStockId: stock.inventory.id,
                lotNumber: stock.inventory.lotNumber,
                availableQuantity: stock.inventory.quantity,
                quantity: quantityToTake,
                unitPrice: quotationProduct.unitPrice,
                totalPrice: 0,
                subTotal: 0,
                taxAmount: 0,
                taxRate: quotationProduct.taxRate,
                discountRate: quotationProduct.discountRate,
                taxRateId: quotationProduct.taxRateId,
                discountAmount: 0,
                productID: stock.product.productID,
                productName: stock.product.name,
              });

              remainingQuantity -= quantityToTake;
            }

            // If we still have remaining quantity after going through all stocks,
            if (remainingQuantity > 0) {
              append({
                productId: quotationProduct.productId,
                inventoryStockId: "",
                lotNumber: "",
                availableQuantity: 0,
                quantity: remainingQuantity,
                unitPrice: quotationProduct.unitPrice,
                totalPrice: 0,
                subTotal: 0,
                taxAmount: 0,
                taxRate: quotationProduct.taxRate,
                discountRate: quotationProduct.discountRate,
                taxRateId: quotationProduct.taxRateId,
                discountAmount: 0,
                productID: quotationProduct.productID,
                productName: quotationProduct.productName,
              });

              insufficientStockWarnings.push(
                `${quotationProduct.productName} (${remainingQuantity} units)`
              );
            }
          }
          // No inventory stocks found for this product at all
          else {
            // Find the product in all inventory stock
            const productFromCatalog = inventoryStock?.find(
              (stock: InventoryStockWithRelations) =>
                stock.product.id === quotationProduct.productId
            );

            if (productFromCatalog) {
              append({
                productId: productFromCatalog.product.id,
                inventoryStockId: "",
                lotNumber: "",
                availableQuantity: 0,
                quantity: quotationProduct.quantity,
                unitPrice: quotationProduct.unitPrice,
                totalPrice: 0,
                subTotal: 0,
                taxAmount: 0,
                taxRate: quotationProduct.taxRate,
                discountRate: quotationProduct.discountRate,
                taxRateId: quotationProduct.taxRateId,
                discountAmount: 0,
                productID: productFromCatalog.product.productID,
                productName: productFromCatalog.product.name,
              });

              noInventoryWarnings.push(
                `${quotationProduct.productName} (${quotationProduct.quantity} units)`
              );
            } else {
              // If we can't even find the product in all inventory, add it anyway
              append({
                productId: quotationProduct.productId,
                inventoryStockId: "",
                lotNumber: "",
                availableQuantity: 0,
                quantity: quotationProduct.quantity,
                unitPrice: quotationProduct.unitPrice,
                totalPrice: 0,
                subTotal: 0,
                taxAmount: 0,
                taxRate: quotationProduct.taxRate,
                discountRate: quotationProduct.discountRate,
                taxRateId: quotationProduct.taxRateId,
                discountAmount: 0,
                productID: quotationProduct.productID,
                productName: quotationProduct.productName,
              });
              productNotFoundErrors.push(quotationProduct.productName);
            }
          }
        }

        // Show warnings and errors
      };

      handleAutoPopulateProducts();
    }
  }, [
    initialData,
    form,
    sourceQuotation,
    stores,
    inventoryStock,
    remove,
    append,
    defaultValues,
  ]);

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

  // Handle country change
  const handleCountryChange = (value: string) => {
    const countryStates = State.getStatesOfCountry(value) || [];
    setStates(countryStates);
    setCities([]);

    form.setValue("deliveryAddress.country", value);
    form.setValue("deliveryAddress.state", "");
    form.setValue("deliveryAddress.city", "");
  };

  // Handle state change
  const handleStateChange = (value: string) => {
    if (!selectedCountry) return;

    const stateCities = City.getCitiesOfState(selectedCountry, value) || [];
    setCities(stateCities);

    form.setValue("deliveryAddress.state", value);
    form.setValue("deliveryAddress.city", "");
  };

  // Set invoice number
  useEffect(() => {
    if (generatedInvoiceNumber && mode === "create") {
      form.setValue("invoiceNumber", generatedInvoiceNumber);
    }
  }, [generatedInvoiceNumber, form, mode]);

  // Update the refresh button handler
  const handleRefreshInvoiceNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedInvoiceNumber) {
          form.setValue("invoiceNumber", generatedInvoiceNumber);
        }
      } catch (error) {
        console.error("Error refreshing invoice number:", error);
        toast.error("Failed to refresh invoice number");
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

    append({
      productId: selectedProduct.product.id,
      inventoryStockId: "",
      lotNumber: "",
      availableQuantity: 0,
      quantity: 0,
      unitPrice: selectedProduct.product.sellingPrice,
      totalPrice: 0,
      subTotal: 0,
      taxAmount: 0,
      taxRate: 0,
      discountRate: 0,
      taxRateId: "",
      discountAmount: 0,
      productID: selectedProduct.product.productID,
      productName: selectedProduct.product.name,
    });
    form.setValue("selectedProductId", "");
  };

  const handleDeleteEntry = (index: number) => {
    remove(index);
  };

  // handle close dialog
  const closeDialog = () => {
    setCustomerDialogOpen(false);
    setTaxDialogOpen(false);
    setProductDialogOpen(false);
    setStoreDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

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

  const handleAddTax = async (data: TaxFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addTax(data, {
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

  const validateInvoiceNumber = (invoiceNumber: string) => {
    const existingSale = sales?.find(
      (sale: SaleWithRelations) => sale.sale.invoiceNumber === invoiceNumber
    );
    if (mode === "create" && existingSale) return false;

    if (
      mode === "edit" &&
      initialData?.sale.invoiceNumber !== invoiceNumber &&
      existingSale
    )
      return false;
    return true;
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = form.getValues();
      if (!user) return;

      if (fields.length === 0) {
        toast.error("At least one product is required");
        return;
      }

      if (!validateInvoiceNumber(values.invoiceNumber)) {
        toast.error("A Sale with the same invoice number already exists.");
        return;
      }

      if (mode === "create") {
        await addSale(
          { data: values, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Sale created successfully!");
              form.reset();
              router.push("/sales");
            },
            onError: (error) => {
              console.error("Create sale error:", error);
              toast.error("Failed to create sale");
            },
          }
        );
      }
      if (mode === "edit" && initialData) {
        if (initialData?.sale.attachments?.length > 0) {
          const prevIds = initialData?.sale.attachments.map(
            (attachment: Attachment) => attachment.id
          );
          await editSale(
            {
              id: initialData?.sale.id,
              data: values,
              prevAttachmentIds: prevIds,
              userId: user.id,
            },
            {
              onSuccess: () => {
                toast.success("Sale updated successfully!");
                form.reset();
                router.push("/sales");
              },
              onError: (error) => {
                console.error("Update sale error:", error);
                toast.error("Failed to update sale");
              },
            }
          );
        } else {
          await editSale(
            {
              id: initialData?.sale.id,
              data: values,
              userId: user.id,
            },
            {
              onSuccess: () => {
                toast.success("Sale updated successfully!");
                form.reset();
                router.push("/sales");
              },
              onError: (error) => {
                console.error("Update sale error:", error);
                toast.error("Failed to update sale");
              },
            }
          );
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  // Get Raw Inventory stocks for entry product
  const getEntryInventoryStocks = useCallback(
    (productId: string) => {
      return inventoryStock?.filter((stock: InventoryStockWithRelations) => {
        if (!selectedStoreId) return false;
        if (stock.inventory.quantity === 0) return false;
        return (
          stock.product.id === productId && stock.store.id === selectedStoreId
        );
      });
    },
    [inventoryStock, selectedStoreId]
  );

  // Calculate raw subtotal per product entry (before any discounts)
  const calculateEntryRawSubTotal = useCallback(
    (index: number) => {
      const quantity = form.watch(`products.${index}.quantity`) || 0;
      const unitPrice = form.watch(`products.${index}.unitPrice`) || 0;
      return quantity * unitPrice;
    },
    [form]
  );

  // Calculate discount amount per product entry
  const calculateEntryDiscountAmount = useCallback(
    (index: number) => {
      const entrySubTotal = calculateEntryRawSubTotal(index);
      const discountRate = form.watch(`products.${index}.discountRate`) || 0;
      return (entrySubTotal * discountRate) / 100;
    },
    [calculateEntryRawSubTotal, form]
  );

  // Calculate taxable amount per product entry (subtotal - discount)
  const calculateEntryTaxableAmount = useCallback(
    (index: number) => {
      const entryRawSubTotal = calculateEntryRawSubTotal(index);
      const entryDiscountAmount = calculateEntryDiscountAmount(index);
      return entryRawSubTotal - entryDiscountAmount;
    },
    [calculateEntryRawSubTotal, calculateEntryDiscountAmount]
  );

  // Calculate tax amount per product entry
  const calculateEntryTaxAmount = useCallback(
    (index: number) => {
      const entryTaxableAmount = calculateEntryTaxableAmount(index);
      const taxRateId = form.watch(`products.${index}.taxRateId`) || "";
      const selectedTax = taxes?.find((tax: Tax) => tax.id === taxRateId);
      const taxRate = selectedTax?.taxRate || 0;
      return (entryTaxableAmount * taxRate) / 100;
    },
    [calculateEntryTaxableAmount, form, taxes]
  );

  // Calculate total per product entry (taxable amount + tax)
  const calculateEntryTotalAmount = useCallback(
    (index: number) => {
      const entryTaxableAmount = calculateEntryTaxableAmount(index);
      const entryTaxAmount = calculateEntryTaxAmount(index);
      return entryTaxableAmount + entryTaxAmount;
    },
    [calculateEntryTaxableAmount, calculateEntryTaxAmount]
  );

  // Calculate overall subtotal (sum of all entry taxable amounts)
  const calculateSubTotal = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTaxableAmount(index);
    });
    return total;
  }, [fields, calculateEntryTaxableAmount]);

  // Calculate overall tax amount (sum of all entry tax amounts)
  const calculateTotalTaxAmount = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTaxAmount(index);
    });
    return total;
  }, [fields, calculateEntryTaxAmount]);

  // Calculate grand total (subtotal + total tax)
  const calculateTotalAmount = useCallback(() => {
    return calculateSubTotal() + calculateTotalTaxAmount();
  }, [calculateSubTotal, calculateTotalTaxAmount]);

  // Calculate total discount amount (sum of all entry discount amounts)
  const calculateTotalDiscountAmount = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryDiscountAmount(index);
    });
    return total;
  }, [fields, calculateEntryDiscountAmount]);

  // fields/entry calculations
  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const entryDiscountAmount = calculateEntryDiscountAmount(index);
        const entryTaxableAmount = calculateEntryTaxableAmount(index);
        const entryTaxAmount = calculateEntryTaxAmount(index);
        const entryTotalAmount = calculateEntryTotalAmount(index);

        // Set individual product entry values
        form.setValue(`products.${index}.discountAmount`, entryDiscountAmount);
        form.setValue(`products.${index}.subTotal`, entryTaxableAmount);

        const taxRateId = form.watch(`products.${index}.taxRateId`) || "";
        const selectedTax = taxes?.find((tax: Tax) => tax.id === taxRateId);
        const taxRate = selectedTax?.taxRate || 0;
        form.setValue(`products.${index}.taxRate`, taxRate);

        form.setValue(`products.${index}.taxAmount`, entryTaxAmount);
        form.setValue(`products.${index}.totalPrice`, entryTotalAmount);
      });

      // Set overall sale values
      form.setValue("subTotal", calculateSubTotal());
      form.setValue("discountAmount", calculateTotalDiscountAmount());
      form.setValue("totalAmount", calculateTotalAmount());
      form.setValue("totalTaxAmount", calculateTotalTaxAmount());
    }
  }, [
    watchedFields,
    fields,
    form,
    calculateSubTotal,
    calculateTotalAmount,
    calculateTotalTaxAmount,
    calculateEntryRawSubTotal,
    calculateEntryDiscountAmount,
    calculateEntryTaxableAmount,
    calculateEntryTaxAmount,
    calculateEntryTotalAmount,
    calculateTotalDiscountAmount,
    taxes,
  ]);

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
                name="invoiceNumber"
                label="Invoice Number"
                placeholder={
                  isLoading || isRefetching
                    ? "Generating..."
                    : "Enter invoice number"
                }
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshInvoiceNumber}
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
              name="saleDate"
              label="Sale Date"
              dateFormat="MM/dd/yyyy"
            />
          </div>
          <div className="w-full flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="customerId"
              label="Customer"
              placeholder="Select customer"
              onAddNew={() => setCustomerDialogOpen(true)}
              key={`customer-select-${form.watch("customerId") || ""}`}
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
              placeholder="Select store"
              onAddNew={() => setStoreDialogOpen(true)}
              key={`store-select-${form.watch("storeId") || ""}`}
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={form.control}
                  name="selectedProductId"
                  label="Select Inventory"
                  placeholder={
                    selectedStoreId ? "Select inventory" : "Select store first"
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
                            (product: ProductWithRelations) => (
                              <TableRow
                                key={product.product.id}
                                className="cursor-pointer hover:bg-blue-50"
                                onClick={() => {
                                  form.setValue(
                                    "selectedProductId",
                                    product.product.id
                                  );
                                  setPrevSelectedProductId(product.product.id);
                                  setSearchQuery("");
                                  // Find and click the hidden SelectItem with this value
                                  const selectItem = document.querySelector(
                                    `[data-value="${product.product.id}"]`
                                  ) as HTMLElement;
                                  if (selectItem) {
                                    selectItem.click();
                                  }
                                }}
                              >
                                <TableCell>
                                  {product.product.productID}
                                </TableCell>
                                <TableCell>{product.product.name}</TableCell>
                                <TableCell>
                                  {product.product.quantity}
                                </TableCell>
                                <TableCell className="w-10">
                                  {prevSelectedProductId ===
                                    product.product.id && (
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
                        {filteredProducts.map(
                          (product: ProductWithRelations) => (
                            <SelectItem
                              key={product.product.id}
                              value={product.product.id}
                              data-value={product.product.id}
                            >
                              {product.product.productID} -
                              {product.product.name}
                              {}
                            </SelectItem>
                          )
                        )}
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
                  <TableHead>Available Qnty</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax Rate(%)</TableHead>
                  <TableHead>Tax Amount</TableHead>
                  <TableHead>Discount Rate(%)</TableHead>
                  <TableHead>Discount Amount</TableHead>
                  <TableHead>Sub-Total</TableHead>
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
                {fields.map((entry, index) => (
                  <TableRow
                    key={`${entry.productId}-${index}`}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productID}</TableCell>
                    <TableCell>{entry.productName}</TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`products.${index}.lotNumber`}
                        label=""
                        placeholder="Lot Number"
                        key={`lotNumber-select-${
                          form.watch(`products.${index}.lotNumber`) || ""
                        }-${index}`}
                      >
                        {inventoryStockLoading ? (
                          <div className="py-4">
                            <Loading />
                          </div>
                        ) : getEntryInventoryStocks(entry.productId)?.length >
                          0 ? (
                          <>
                            <Table className="shad-table border border-light-200 rounded-lg">
                              <TableHeader>
                                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                                  <TableHead>Lot Number</TableHead>
                                  <TableHead>Qnty</TableHead>
                                  <TableHead>Expiry Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="w-full bg-white">
                                {getEntryInventoryStocks(entry.productId).map(
                                  (stock: InventoryStockWithRelations) => (
                                    <TableRow
                                      key={stock.inventory.id}
                                      className="cursor-pointer hover:bg-blue-50"
                                      onClick={() => {
                                        form.setValue(
                                          `products.${index}.inventoryStockId`,
                                          stock.inventory.id
                                        );
                                        form.setValue(
                                          `products.${index}.lotNumber`,
                                          stock.inventory.lotNumber
                                        );
                                        form.setValue(
                                          `products.${index}.availableQuantity`,
                                          stock.inventory.quantity
                                        );
                                        form.setValue(
                                          `products.${index}.unitPrice`,
                                          stock.inventory.sellingPrice
                                        );

                                        // Find and click the hidden SelectItem with this value
                                        const selectItem =
                                          document.querySelector(
                                            `[data-value="${stock.inventory.id}"]`
                                          ) as HTMLElement;
                                        if (selectItem) {
                                          selectItem.click();
                                        }
                                      }}
                                    >
                                      <TableCell>
                                        {stock.inventory.lotNumber}
                                      </TableCell>
                                      <TableCell>
                                        {stock.inventory.quantity}
                                      </TableCell>
                                      <TableCell>
                                        {stock.inventory.expiryDate
                                          ? formatDateTime(
                                              stock.inventory.expiryDate
                                            ).dateTime
                                          : "N/A"}
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                            {/* Hidden select options for form control */}
                            <div className="hidden">
                              {getEntryInventoryStocks(entry.productId).map(
                                (stock: InventoryStockWithRelations) => (
                                  <SelectItem
                                    key={stock.inventory.id}
                                    value={stock.inventory.lotNumber}
                                    className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                                    data-value={stock.inventory.id}
                                    onClick={() => {
                                      form.setValue(
                                        `products.${index}.inventoryStockId`,
                                        stock.inventory.id
                                      );
                                      form.setValue(
                                        `products.${index}.lotNumber`,
                                        stock.inventory.lotNumber
                                      );
                                      form.setValue(
                                        `products.${index}.availableQuantity`,
                                        stock.inventory.quantity
                                      );
                                      form.setValue(
                                        `products.${index}.unitPrice`,
                                        stock.inventory.sellingPrice
                                      );
                                    }}
                                  >
                                    {stock.inventory.lotNumber}
                                  </SelectItem>
                                )
                              )}
                            </div>
                          </>
                        ) : (
                          <SelectItem value="null" disabled>
                            No lot number available
                          </SelectItem>
                        )}
                      </CustomFormField>
                    </TableCell>

                    <TableCell>
                      {formatNumber(
                        String(
                          form.watch(`products.${index}.availableQuantity`)
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.NUMBER}
                        control={form.control}
                        name={`products.${index}.quantity`}
                        label=""
                        placeholder="Qty"
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`products.${index}.unitPrice`}
                        label=""
                        placeholder="Unit price"
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`products.${index}.taxRateId`}
                        label=""
                        placeholder="Tax Rate"
                        onAddNew={() => setTaxDialogOpen(true)}
                        key={`tax-select-${
                          form.watch(`products.${index}.taxRateId`) || ""
                        }-${index}`}
                      >
                        {taxesLoading && (
                          <div className="py-4">
                            <Loading />
                          </div>
                        )}
                        {taxes?.map((tax: Tax) => (
                          <SelectItem
                            key={tax.id}
                            value={tax.id}
                            className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                          >
                            {tax.code} - {`${tax.taxRate}%`}
                          </SelectItem>
                        ))}
                      </CustomFormField>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                        <FormatNumber value={calculateEntryTaxAmount(index)} />
                      </div>
                    </TableCell>

                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.NUMBER}
                        control={form.control}
                        name={`products.${index}.discountRate`}
                        label=""
                        placeholder="Discount %"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                        <FormatNumber
                          value={calculateEntryDiscountAmount(index)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={calculateEntryTaxableAmount(index)}
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
                ))}
                {/* Total amount row */}
                {fields.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        {`Sub-Total:`}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateSubTotal()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        {`Total Discount:`}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateTotalDiscountAmount()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        {`Total Tax:`}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateTotalTaxAmount()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-right font-semibold text-blue-800 text-[17px] py-4"
                      >
                        {`Grand Total:`}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-semibold text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateTotalAmount()} />
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
            {form.formState.errors.products && (
              <p className="shad-error text-xs">
                {form.formState.errors.products.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4 pt-5">
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="amountPaid"
              label="Amount Paid"
              placeholder="Amount paid"
            />
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="paymentMethod"
              label="Payment Method"
              placeholder="Select payment method"
              key={`payment-select-${form.watch("status") || ""}`}
            >
              {Object.values(PaymentMethod).map((method) => (
                <SelectItem
                  key={method}
                  value={method}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {method}
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="paymentStatus"
              label="Payment Status"
              placeholder="Select payment status"
              key={`payment-status-${form.watch("status") || ""}`}
            >
              {Object.values(PaymentStatus).map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {status}
                </SelectItem>
              ))}
            </CustomFormField>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="status"
              label="Sale Status"
              placeholder="Select status"
              key={`status-select-${form.watch("status") || ""}`}
            >
              {Object.values(SaleStatus).map((status) => (
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

          <div className="flex flex-col gap-5 ">
            <CustomFormField
              fieldType={FormFieldType.SWITCH}
              control={form.control}
              name="isDeliveryAddressAdded"
              label="Delivery address ?"
            />
            {isDeliveryAddressAdded && !sourceQuotation && (
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
                    selectedCountry
                      ? "Select a state"
                      : "Select a country first"
                  }
                  onValueChange={handleStateChange}
                  disabled={!selectedCountry}
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
                  onValueChange={(value) =>
                    form.setValue("deliveryAddress.city", value)
                  }
                  disabled={!selectedState}
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
            )}
          </div>

          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="attachments"
            label="Attachment"
            renderSkeleton={(field) => (
              <FormControl>
                <FileUploader
                  files={field.value}
                  onChange={field.onChange}
                  mode={mode}
                  accept={{
                    "application/pdf": [".pdf"],
                    "application/msword": [".doc"],
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                      [".docx"],
                  }}
                  maxFiles={5}
                />
              </FormControl>
            )}
          />
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="notes"
            label="Notes"
            placeholder="Enter sale notes"
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
              isLoading={isAddingSale || isEditingSale}
              className="shad-primary-btn"
            >
              {mode === "create" ? "Create Sale" : "Update Sale"}
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
      <TaxDialog
        mode="add"
        onSubmit={handleAddTax}
        open={taxDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingTax}
      />
      <ProductSheet
        mode="add"
        open={productDialogOpen}
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

export default SaleForm;
