"use client";

import {
  CustomerFormValues,
  SaleFormValidation,
  SaleFormValues,
  StoreFormValues,
  TaxFormValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import FormatNumber from "@/components/FormatNumber";
import { useSales } from "@/hooks/useSales";
import { useRouter } from "next/navigation";
import {
  Attachment,
  Customer,
  InventoryStockWithRelations,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductWithRelations,
  QuotationWithRelations,
  SaleStatus,
  SaleWithRelations,
  Store,
  Tax,
} from "@/types";
import CustomerDialog from "../customers/CustomerDialog";
import { generateInvoiceNumber } from "@/lib/actions/sale.actions";
import { RefreshCw } from "lucide-react";
import TaxDialog from "../taxes/TaxDialog";
import { FileUploader } from "../FileUploader";
import ProductSheet from "../products/ProductSheet";
import { Country, State, City } from "country-state-city";
import { IState, ICity } from "country-state-city";
import { Check } from "lucide-react";
import { X } from "lucide-react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import StoreDialog from "../stores/StoreDialog";
import InventoryStockSelectDialog from "../sales/InventoryStockSelectDialog";
import { cn } from "@/lib/utils";
import CustomerQuotationsDialog from "../sales/CustomerQuotationsDialog";
import { useCustomers } from "@/hooks/useCustomers";
import { useTaxes } from "@/hooks/useTaxes";
import { useStores } from "@/hooks/useStores";

interface SaleFormProps {
  mode: "create" | "edit";
  initialData?: SaleWithRelations;
  sourceQuotation?: QuotationWithRelations;
  customers: Customer[];
  products: ProductWithRelations[];
  sales: SaleWithRelations[];
  taxes: Tax[];
  stores: Store[];
  inventoryStock: InventoryStockWithRelations[];
  quotations: QuotationWithRelations[];
  generatedInvoiceNumber?: string;
}

const SaleForm = ({
  mode,
  initialData,
  sourceQuotation,
  customers,
  products,
  sales,
  taxes,
  stores,
  inventoryStock,
  quotations,
  generatedInvoiceNumber: initialGeneratedInvoiceNumber,
}: SaleFormProps) => {
  const [isRefetchingInvoiceNumber, setIsRefetchingInvoiceNumber] =
    useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedProductId, setPrevSelectedProductId] = useState<
    string | null
  >(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<
    number | null
  >(null);

  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);

  const { addSale, isAddingSale, editSale, isEditingSale } = useSales();
  const { addCustomer } = useCustomers();
  const { addTax, isAddingTax } = useTaxes();
  const { addStore, isAddingStore } = useStores();

  const router = useRouter();
  const initialMount = useRef(true);

  // Memoized default values for new sales
  const defaultValues = useMemo(
    () => ({
      invoiceNumber: initialGeneratedInvoiceNumber || "",
      saleDate: new Date(),
      customerId: "",
      storeId: "",
      subTotal: 0,
      totalAmount: 0,
      discountAmount: 0,
      totalTaxAmount: 0,
      amountPaid: 0,
      status: SaleStatus.Pending as SaleStatus,
      paymentMethod: PaymentMethod.Cash as PaymentMethod,
      paymentStatus: PaymentStatus.Pending as PaymentStatus,
      notes: "",
      products: [],
      quotationId: undefined,
      attachments: [],
      isDeliveryAddressAdded: false,
      deliveryAddress: {
        addressName: "",
        address: "",
        city: "",
        state: "",
        country: "",
        email: "",
        phone: "",
      },
      selectedProductId: "",
    }),
    [initialGeneratedInvoiceNumber]
  );

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(SaleFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, remove, prepend } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedCustomerId = form.watch("customerId");
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
    lotNumber: form.watch(`products.${index}.inventoryStock`),
  }));

  const filteredProducts = useMemo(() => {
    return products?.reduce((acc: Product[], product: ProductWithRelations) => {
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
    }, []);
  }, [inventoryStock, products, searchQuery, selectedStoreId]);

  // initialize data in edit mode
  useEffect(() => {
    if (initialMount.current) {
      if (initialData) {
        form.reset({
          invoiceNumber: initialData.sale.invoiceNumber || "",
          saleDate: initialData.sale.saleDate
            ? new Date(initialData.sale.saleDate)
            : new Date(),
          products: initialData.products || [],
          customerId: initialData.sale.customerId || "",
          storeId: initialData.sale.storeId || "",
          status: initialData.sale.status || SaleStatus.Pending,
          notes: initialData.sale.notes || "",
          amountPaid: initialData.sale.amountPaid || 0,
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
          paymentMethod: initialData.sale.paymentMethod || PaymentMethod.Cash,
          paymentStatus:
            initialData.sale.paymentStatus || PaymentStatus.Pending,
          quotationId: initialData.sale?.quotationId || undefined,
          selectedProductId: "",
        });

        if (initialData.sale.deliveryAddress?.country) {
          const countryStates =
            State.getStatesOfCountry(
              initialData.sale.deliveryAddress.country
            ) || [];
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
      } else if (sourceQuotation) {
        form.reset({
          invoiceNumber: initialGeneratedInvoiceNumber || "",
          saleDate: new Date(),
          customerId: sourceQuotation.quotation.customerId,
          storeId: stores[0]?.id || "",
          notes: sourceQuotation.quotation.notes,
          quotationId: sourceQuotation.quotation.id,
          attachments: sourceQuotation.quotation.attachments || [],
          isDeliveryAddressAdded:
            sourceQuotation.quotation.isDeliveryAddressAdded,
          deliveryAddress: sourceQuotation.quotation.deliveryAddress
            ? {
                addressName:
                  sourceQuotation.quotation.deliveryAddress.addressName || "",
                address:
                  sourceQuotation.quotation.deliveryAddress.address || "",
                city: sourceQuotation.quotation.deliveryAddress.city || "",
                state: sourceQuotation.quotation.deliveryAddress.state || "",
                country:
                  sourceQuotation.quotation.deliveryAddress.country || "",
                email: sourceQuotation.quotation.deliveryAddress.email || "",
                phone: sourceQuotation.quotation.deliveryAddress.phone || "",
              }
            : {
                addressName: "",
                address: "",
                city: "",
                state: "",
                country: "",
                email: "",
                phone: "",
              },
          products: sourceQuotation.products.map((qp) => ({
            productId: qp.productId,
            inventoryStock: [],
            hasBackorder: false,
            backorderQuantity: 0,
            quantity: qp.quantity,
            unitPrice: qp.unitPrice,
            totalPrice: 0,
            subTotal: 0,
            taxAmount: 0,
            taxRate: qp.taxRate,
            discountRate: qp.discountRate,
            taxRateId: qp.taxRateId,
            discountAmount: 0,
            productID: qp.productID,
            productName: qp.productName,
          })),
          amountPaid: 0,
          discountAmount: 0,
          totalTaxAmount: 0,
          subTotal: 0,
          totalAmount: 0,
          paymentMethod: PaymentMethod.Cash,
          paymentStatus: PaymentStatus.Pending,
          status: SaleStatus.Pending,
          selectedProductId: "",
        });

        if (sourceQuotation.quotation.deliveryAddress?.country) {
          setStates(
            State.getStatesOfCountry(
              sourceQuotation.quotation.deliveryAddress.country
            ) || []
          );
          if (sourceQuotation.quotation.deliveryAddress?.state) {
            setCities(
              City.getCitiesOfState(
                sourceQuotation.quotation.deliveryAddress.country,
                sourceQuotation.quotation.deliveryAddress.state
              ) || []
            );
          }
        }
      } else if (mode === "create" && initialGeneratedInvoiceNumber) {
        form.setValue("invoiceNumber", initialGeneratedInvoiceNumber);
      }
      initialMount.current = false;
    }
  }, [
    initialData,
    sourceQuotation,
    initialGeneratedInvoiceNumber,
    mode,
    form,
    stores,
  ]);

  useEffect(() => {
    if (
      mode === "create" &&
      initialGeneratedInvoiceNumber &&
      form.getValues("invoiceNumber") === ""
    ) {
      form.setValue("invoiceNumber", initialGeneratedInvoiceNumber);
    }
  }, [initialGeneratedInvoiceNumber, form, mode]);

  // Effects for country/state/city changes (these are fine as they are, independent)
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
    form.setValue("deliveryAddress.country", value);
    form.setValue("deliveryAddress.state", "");
    form.setValue("deliveryAddress.city", "");
  };

  // Handle state change
  const handleStateChange = (value: string) => {
    if (!selectedCountry) return;
    form.setValue("deliveryAddress.state", value);
    form.setValue("deliveryAddress.city", "");
  };

  // Refresh button handler
  const handleRefreshInvoiceNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingInvoiceNumber(true);
        const newInvoiceNumber = await generateInvoiceNumber();
        form.setValue("invoiceNumber", newInvoiceNumber);
      } catch (error) {
        console.error("Error refreshing invoice number:", error);
        toast.error("Failed to refresh invoice number");
      } finally {
        setIsRefetchingInvoiceNumber(false);
      }
    }
  };

  // Cancel button handler
  const handleCancel = () => {
    if (mode === "create") {
      form.reset(defaultValues);
      form.setValue("invoiceNumber", initialGeneratedInvoiceNumber || "");
    } else {
      form.reset(
        initialData
          ? {
              invoiceNumber: initialData.sale.invoiceNumber || "",
              saleDate: initialData.sale.saleDate
                ? new Date(initialData.sale.saleDate)
                : new Date(),
              products: initialData.products || [],
              customerId: initialData.sale.customerId || "",
              storeId: initialData.sale.storeId || "",
              status: initialData.sale.status || SaleStatus.Pending,
              notes: initialData.sale.notes || "",
              amountPaid: initialData.sale.amountPaid || 0,
              discountAmount: initialData.sale.discountAmount || 0,
              totalTaxAmount: initialData.sale.totalTaxAmount || 0,
              subTotal: initialData.sale.subTotal || 0,
              totalAmount: initialData.sale.totalAmount || 0,
              attachments: initialData.sale.attachments || [],
              isDeliveryAddressAdded:
                initialData.sale.isDeliveryAddressAdded || false,
              deliveryAddress: {
                addressName:
                  initialData.sale.deliveryAddress?.addressName || "",
                address: initialData.sale.deliveryAddress?.address || "",
                city: initialData.sale.deliveryAddress?.city || "",
                state: initialData.sale.deliveryAddress?.state || "",
                country: initialData.sale.deliveryAddress?.country || "",
                email: initialData.sale.deliveryAddress?.email || "",
                phone: initialData.sale.deliveryAddress?.phone || "",
              },
              paymentMethod:
                initialData.sale.paymentMethod || PaymentMethod.Cash,
              paymentStatus:
                initialData.sale.paymentStatus || PaymentStatus.Pending,
              quotationId: initialData.sale.quotationId || undefined,
              selectedProductId: "",
            }
          : defaultValues
      );
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
      inventoryStock: [],
      hasBackorder: false,
      backorderQuantity: 0,
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
  const closeDialog = useCallback(() => {
    setCustomerDialogOpen(false);
    setTaxDialogOpen(false);
    setProductDialogOpen(false);
    setStoreDialogOpen(false);
    setQuotationDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  const handleAddCustomer = useCallback(
    async (data: CustomerFormValues): Promise<void> => {
      return new Promise((resolve, reject) => {
        addCustomer(data, {
          onSuccess: () => {
            closeDialog();
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        });
      });
    },
    [addCustomer, closeDialog]
  );
  const handleAddTax = useCallback(
    async (data: TaxFormValues): Promise<void> => {
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
    },
    [addTax, closeDialog]
  );
  const handleAddStore = useCallback(
    async (data: StoreFormValues): Promise<void> => {
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
    },
    [addStore, closeDialog]
  );
  const validateInvoiceNumber = useCallback(
    (invoiceNumber: string) => {
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
    },
    [sales, mode, initialData]
  );

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = form.getValues();

      if (fields.length === 0) {
        toast.error("At least one product is required");
        return;
      }

      if (!validateInvoiceNumber(values.invoiceNumber)) {
        toast.error("A Sale with the same invoice number already exists.");
        return;
      }

      // Show a loading toast immediately
      const loadingToastId = toast.loading(
        mode === "create" ? "Creating sale..." : "Updating sale..."
      );

      try {
        if (mode === "create") {
          await addSale(
            { data: values },
            {
              onSuccess: () => {
                toast.success("Sale created successfully!", {
                  id: loadingToastId,
                });
                router.push("/sales");
                router.refresh();
                form.reset(defaultValues);
              },
            }
          );
        }
        if (mode === "edit" && initialData) {
          const prevIds = (initialData?.sale?.attachments ?? []).map(
            (attachment: Attachment) => attachment.id
          );
          await editSale(
            {
              id: initialData?.sale.id,
              data: values,
              prevAttachmentIds: prevIds,
            },
            {
              onSuccess: () => {
                toast.success("Sale updated successfully!", {
                  id: loadingToastId,
                });
                router.push("/sales");
                router.refresh();
                form.reset(defaultValues);
              },
            }
          );
        }
      } catch (error) {
        console.error("Sale error:", error);
        toast.error(
          `Failed to ${mode === "create" ? "create" : "update"} sale`,
          { id: loadingToastId }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
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

  const getTaxRate = useCallback(
    (taxRateId: string) => {
      const selectedTax = taxes?.find((tax: Tax) => tax.id === taxRateId);
      return selectedTax?.taxRate || 0;
    },
    [taxes]
  );

  const calculateEntryRawSubTotal = useCallback(
    (index: number) => {
      const quantity = form.getValues(`products.${index}.quantity`) || 0;
      const unitPrice = form.getValues(`products.${index}.unitPrice`) || 0;
      return quantity * unitPrice;
    },
    [form]
  );

  const calculateEntryDiscountAmount = useCallback(
    (index: number) => {
      const entrySubTotal = calculateEntryRawSubTotal(index);
      const discountRate =
        form.getValues(`products.${index}.discountRate`) || 0;
      return (entrySubTotal * discountRate) / 100;
    },
    [calculateEntryRawSubTotal, form]
  );

  const calculateEntryTaxableAmount = useCallback(
    (index: number) => {
      const entryRawSubTotal = calculateEntryRawSubTotal(index);
      const entryDiscountAmount = calculateEntryDiscountAmount(index);
      return entryRawSubTotal - entryDiscountAmount;
    },
    [calculateEntryRawSubTotal, calculateEntryDiscountAmount]
  );

  const calculateEntryTaxAmount = useCallback(
    (index: number) => {
      const entryTaxableAmount = calculateEntryTaxableAmount(index);
      const taxRateId = form.getValues(`products.${index}.taxRateId`) || "";
      const taxRate = getTaxRate(taxRateId);
      return (entryTaxableAmount * taxRate) / 100;
    },
    [calculateEntryTaxableAmount, form, getTaxRate]
  );

  const calculateEntryTotalAmount = useCallback(
    (index: number) => {
      const entryTaxableAmount = calculateEntryTaxableAmount(index);
      const entryTaxAmount = calculateEntryTaxAmount(index);
      return entryTaxableAmount + entryTaxAmount;
    },
    [calculateEntryTaxableAmount, calculateEntryTaxAmount]
  );

  const calculateSubTotal = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTaxableAmount(index);
    });
    return total;
  }, [fields, calculateEntryTaxableAmount]);

  const calculateTotalTaxAmount = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTaxAmount(index);
    });
    return total;
  }, [fields, calculateEntryTaxAmount]);

  const calculateTotalAmount = useCallback(() => {
    return calculateSubTotal() + calculateTotalTaxAmount();
  }, [calculateSubTotal, calculateTotalTaxAmount]);

  const calculateTotalDiscountAmount = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryDiscountAmount(index);
    });
    return total;
  }, [fields, calculateEntryDiscountAmount]);

  useEffect(() => {
    if (fields.length === 0) {
      if (form.getValues("subTotal") !== 0) form.setValue("subTotal", 0);
      if (form.getValues("discountAmount") !== 0)
        form.setValue("discountAmount", 0);
      if (form.getValues("totalAmount") !== 0) form.setValue("totalAmount", 0);
      if (form.getValues("totalTaxAmount") !== 0)
        form.setValue("totalTaxAmount", 0);
      return;
    }

    let overallSubTotal = 0;
    let overallDiscountAmount = 0;
    let overallTotalTaxAmount = 0;

    fields.forEach((_, index) => {
      const entryDiscountAmount = calculateEntryDiscountAmount(index);
      const entryTaxableAmount = calculateEntryTaxableAmount(index);
      const entryTaxAmount = calculateEntryTaxAmount(index);
      const entryTotalAmount = calculateEntryTotalAmount(index);

      const taxRateId = form.getValues(`products.${index}.taxRateId`) || "";
      const taxRate = getTaxRate(taxRateId);

      if (
        form.getValues(`products.${index}.discountAmount`) !==
        entryDiscountAmount
      ) {
        form.setValue(`products.${index}.discountAmount`, entryDiscountAmount);
      }
      if (form.getValues(`products.${index}.subTotal`) !== entryTaxableAmount) {
        form.setValue(`products.${index}.subTotal`, entryTaxableAmount);
      }
      if (form.getValues(`products.${index}.taxRate`) !== taxRate) {
        form.setValue(`products.${index}.taxRate`, taxRate);
      }
      if (form.getValues(`products.${index}.taxAmount`) !== entryTaxAmount) {
        form.setValue(`products.${index}.taxAmount`, entryTaxAmount);
      }
      if (form.getValues(`products.${index}.totalPrice`) !== entryTotalAmount) {
        form.setValue(`products.${index}.totalPrice`, entryTotalAmount);
      }

      overallSubTotal += entryTaxableAmount;
      overallDiscountAmount += entryDiscountAmount;
      overallTotalTaxAmount += entryTaxAmount;
    });

    const overallTotalAmount = overallSubTotal + overallTotalTaxAmount;

    // Set overall sale values only if they've changed
    if (form.getValues("subTotal") !== overallSubTotal) {
      form.setValue("subTotal", overallSubTotal);
    }
    if (form.getValues("discountAmount") !== overallDiscountAmount) {
      form.setValue("discountAmount", overallDiscountAmount);
    }
    if (form.getValues("totalAmount") !== overallTotalAmount) {
      form.setValue("totalAmount", overallTotalAmount);
    }
    if (form.getValues("totalTaxAmount") !== overallTotalTaxAmount) {
      form.setValue("totalTaxAmount", overallTotalTaxAmount);
    }
  }, [
    watchedFields,
    fields,
    form,
    getTaxRate,
    calculateSubTotal,
    calculateTotalAmount,
    calculateTotalTaxAmount,
    calculateEntryRawSubTotal,
    calculateEntryDiscountAmount,
    calculateEntryTaxableAmount,
    calculateEntryTaxAmount,
    calculateEntryTotalAmount,
    calculateTotalDiscountAmount,
  ]);

  // customer quotations
  const customerQuotations = useMemo(() => {
    if (!selectedCustomerId) return [];
    return (
      quotations?.reduce(
        (acc: QuotationWithRelations[], quotation: QuotationWithRelations) => {
          if (!quotation.customer.id || !quotation.quotation.customerId) {
            return acc;
          }

          const isNotConverted = quotation.quotation.convertedToSale === false;
          const isSameCustomer = quotation.customer.id === selectedCustomerId;

          if (isNotConverted && isSameCustomer) {
            acc.push(quotation);
          }

          return acc;
        },
        []
      ) || []
    );
  }, [quotations, selectedCustomerId]);

  const isAnyMutationLoading =
    isAddingSale || isEditingSale || isAddingStore || isAddingTax;

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
                placeholder={"Enter invoice number"}
                disabled={isAnyMutationLoading}
              />
              {mode === "create" && (
                <Button
                  type="button"
                  size={"icon"}
                  onClick={handleRefreshInvoiceNumber}
                  className="self-end shad-primary-btn px-5"
                  disabled={isRefetchingInvoiceNumber || isAnyMutationLoading}
                >
                  <RefreshCw
                    className={cn(
                      "h-5 w-5",
                      isRefetchingInvoiceNumber && "animate-spin"
                    )}
                  />
                </Button>
              )}
            </div>
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="saleDate"
              label="Sale Date"
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
              placeholder={"Select customer"}
              onAddNew={() => setCustomerDialogOpen(true)}
              key={`customer-select-${form.watch("customerId") || ""}`}
              disabled={!!sourceQuotation || isAnyMutationLoading}
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
              placeholder="Select store"
              onAddNew={() => setStoreDialogOpen(true)}
              key={`store-select-${form.watch("storeId") || ""}`}
              disabled={isAnyMutationLoading}
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
                  disabled={!selectedStoreId || isAnyMutationLoading}
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
                        disabled={!selectedStoreId || isAnyMutationLoading}
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
                  {filteredProducts && filteredProducts.length > 0 ? (
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
                          {filteredProducts.map((product: Product) => (
                            <TableRow
                              key={product.id}
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                if (isAnyMutationLoading) return;
                                form.setValue("selectedProductId", product.id);
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
                          ))}
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
                disabled={!selectedProductId || isAnyMutationLoading}
                className="self-end shad-primary-btn h-11"
              >
                Add Inventory
              </Button>
            </div>

            {!sourceQuotation &&
              customerQuotations &&
              customerQuotations?.length > 0 && (
                <div className="flex flex-col items-center justify-center gap-2 bg-red-600/10 p-5 rounded-md border border-red-600 text-center">
                  <Button
                    type="button"
                    className="shad-danger-btn w-fit"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuotationDialogOpen(true);
                    }}
                    disabled={isAnyMutationLoading}
                  >
                    View Pending Quotations
                  </Button>
                  <p className="text-red-600 text-sm">
                    ⚠️ Pending quotations found for this cutomer
                  </p>
                </div>
              )}

            <Table className="shad-table">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>#</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead className="!max-w-60">Lot Number</TableHead>
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
                {fields.map((entry, index) => {
                  const entryStock = form.watch(
                    `products.${index}.inventoryStock`
                  );
                  const bckOrderQnty =
                    form.watch(`products.${index}.backorderQuantity`) || 0;

                  const entryQnty =
                    form.watch(`products.${index}.quantity`) || 0;

                  return (
                    <TableRow
                      key={`${entry.productId}-${index}`}
                      className={cn("w-full", {
                        "bg-blue-50": index % 2 === 1,
                      })}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{entry.productID}</TableCell>
                      <TableCell>{entry.productName}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedProductIndex(index)}
                          disabled={
                            form.watch(`products.${index}.quantity`) <= 0 ||
                            isAnyMutationLoading
                          }
                          type="button"
                          className={cn(
                            "text-white border-0",
                            entryQnty > 0 &&
                              entryStock.reduce(
                                (acc, stock) => acc + stock.quantityToTake,
                                0
                              ) +
                                bckOrderQnty ===
                                entryQnty
                              ? "bg-green-500"
                              : "bg-red-500"
                          )}
                          title="Manage Lot Numbers / Inventory stock"
                        >
                          {form.watch(`products.${index}.quantity`) <= 0
                            ? "Add Qnty first"
                            : "Manage Lots"}
                        </Button>
                        <InventoryStockSelectDialog
                          open={selectedProductIndex === index}
                          onOpenChange={(open) =>
                            setSelectedProductIndex(open ? index : null)
                          }
                          productID={entry.productID}
                          requiredQuantity={form.watch(
                            `products.${index}.quantity`
                          )}
                          availableStocks={getEntryInventoryStocks(
                            entry.productId
                          )}
                          selectedInventoryStock={entry.inventoryStock}
                          hasBackorder={entry.hasBackorder}
                          backorderQuantity={entry.backorderQuantity ?? 0}
                          onSave={(
                            stock,
                            includeBackorder,
                            backorderQuantity
                          ) => {
                            form.setValue(
                              `products.${index}.inventoryStock`,
                              stock
                            );
                            form.setValue(
                              `products.${index}.hasBackorder`,
                              includeBackorder
                            );
                            form.setValue(
                              `products.${index}.backorderQuantity`,
                              backorderQuantity
                            );
                            form.trigger(`products.${index}.inventoryStock`);
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
                          name={`products.${index}.quantity`}
                          label=""
                          placeholder="Qty"
                          disabled={isAnyMutationLoading}
                        />
                      </TableCell>
                      <TableCell>
                        <CustomFormField
                          fieldType={FormFieldType.AMOUNT}
                          control={form.control}
                          name={`products.${index}.unitPrice`}
                          label=""
                          placeholder="Unit price"
                          disabled={isAnyMutationLoading}
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
                          disabled={isAnyMutationLoading}
                        >
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
                          <FormatNumber
                            value={calculateEntryTaxAmount(index)}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <CustomFormField
                          fieldType={FormFieldType.NUMBER}
                          control={form.control}
                          name={`products.${index}.discountRate`}
                          label=""
                          placeholder="Discount %"
                          disabled={isAnyMutationLoading}
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
                            onClick={() => {
                              if (!isAnyMutationLoading)
                                handleDeleteEntry(index);
                            }}
                            className={cn(
                              "p-1 cursor-pointer",
                              isAnyMutationLoading
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-red-600 hover:bg-light-200 hover:rounded-md"
                            )}
                          >
                            <DeleteIcon className="h-5 w-5" />
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total amount row */}
                {fields.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell
                        colSpan={10}
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
                        colSpan={10}
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
                        colSpan={10}
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
                        colSpan={10}
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
              disabled={isAnyMutationLoading}
            />
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="paymentMethod"
              label="Payment Method"
              placeholder="Select payment method"
              key={`payment-select-${form.watch("status") || ""}`}
              disabled={isAnyMutationLoading}
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
              disabled={isAnyMutationLoading}
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
              disabled={isAnyMutationLoading}
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
              disabled={isAnyMutationLoading}
            />
            {isDeliveryAddressAdded && !sourceQuotation && (
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
                    selectedCountry
                      ? "Select a state"
                      : "Select a country first"
                  }
                  onValueChange={handleStateChange}
                  disabled={!selectedCountry || isAnyMutationLoading}
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
                  disabled={isAnyMutationLoading}
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
              isLoading={isAddingSale || isEditingSale}
              className="shad-primary-btn"
              disabled={isAnyMutationLoading}
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

      <CustomerQuotationsDialog
        open={
          !!(
            quotationDialogOpen &&
            customerQuotations &&
            customerQuotations.length > 0
          )
        }
        quotations={customerQuotations || []}
        customer={
          customers?.find(
            (customer: Customer) => customer.id === selectedCustomerId
          ) as Customer
        }
        onOpenChange={closeDialog}
      />
    </>
  );
};

export default SaleForm;
