"use client";

import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form, FormControl } from "../ui/form";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { SelectItem } from "../ui/select";
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import {
  Package,
  Truck,
  Plane,
  Ship,
  Plus,
  Calculator,
  Info,
} from "lucide-react";
import { ShipmentFormValidation, ShipmentFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Loading from "@/app/(dashboard)/loading";
import { usePurchases } from "@/hooks/usePurchases";
import { useVendors } from "@/hooks/useVendors";
import {
  ShipmentStatus,
  ShipperType,
  PurchaseWithRelations,
  ShipmentWithRelations,
  PackageType,
  CarrierType,
  ShippingMode,
  Vendor,
  PurchaseItem,
  ProductWithRelations,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import VendorDialog from "../vendors/VendorDialog";
import { FileUploader } from "../FileUploader";
import { generateShipmentRefNumber } from "@/lib/actions/shipment.actions";
import { useShipments } from "@/hooks/useShipments";
import { cn } from "@/lib/utils";
import { EditIcon } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { MultiSelectOption } from "../ui/multi-select";
import FormatNumber from "../FormatNumber";
import { useProducts } from "@/hooks/useProducts";
import { useRouter } from "next/navigation";

interface ShipmentFormProps {
  mode: "create" | "edit";
  initialData?: ShipmentWithRelations;
}

// Carrier options based on shipping method and carrier type
const CARRIER_OPTIONS = {
  [ShippingMode.Express]: {
    [CarrierType.ExpressCargo]: [
      { value: "DHL", label: "DHL Express" },
      { value: "FedEx", label: "FedEx Express" },
      { value: "UPS", label: "UPS Express" },
      { value: "TNT", label: "TNT Express" },
      { value: "USPS", label: "USPS Express" },
    ],
    [CarrierType.AirCargo]: [
      { value: "AirFrance", label: "Air France Cargo" },
      { value: "Lufthansa", label: "Lufthansa Cargo" },
      { value: "Emirates", label: "Emirates SkyCargo" },
      { value: "Qatar", label: "Qatar Airways Cargo" },
      { value: "Turkish", label: "Turkish Cargo" },
      { value: "Brussels", label: "Brussels Airlines Cargo" },
    ],
  },
  [ShippingMode.Air]: {
    [CarrierType.AirCargo]: [
      { value: "AirFrance", label: "Air France Cargo" },
      { value: "Lufthansa", label: "Lufthansa Cargo" },
      { value: "Emirates", label: "Emirates SkyCargo" },
      { value: "Qatar", label: "Qatar Airways Cargo" },
      { value: "Turkish", label: "Turkish Cargo" },
      { value: "Brussels", label: "Brussels Airlines Cargo" },
    ],
  },
  [ShippingMode.Sea]: {
    [CarrierType.SeaCargo]: [
      { value: "Maersk", label: "Maersk Line" },
      { value: "MSC", label: "MSC" },
      { value: "COSCO", label: "COSCO Shipping" },
      { value: "Evergreen", label: "Evergreen Line" },
      { value: "OOCL", label: "OOCL" },
    ],
  },
};

const ShipmentForm = ({ mode, initialData }: ShipmentFormProps) => {
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [isAddingParcel, setIsAddingParcel] = useState(false);
  const [editingParcelIndex, setEditingParcelIndex] = useState<number | null>(
    null
  );

  // Current parcel items being added/edited
  const [currentParcelItems, setCurrentParcelItems] = useState<
    Array<{
      productId?: string;
      productName: string;
      productID: string;
      productUnit: string;
      quantity: number;
      netWeight: number;
      isPurchaseItem: boolean;
      purchaseReference?: string;
    }>
  >([]);

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    productName: "",
    productID: "",
    productUnit: "",
    quantity: 0,
    netWeight: 0,
    isPurchaseItem: true,
    selectedPurchaseItem: "",
  });

  const router = useRouter();

  const { vendors, isLoading: vendorsLoading } = useVendors({
    getAllVendors: true,
  });
  const { purchases, isLoading: purchasesLoading } = usePurchases({
    getAllPurchases: true,
  });
  const { products } = useProducts({ getAllProducts: true });
  const { shipments, addShipment, isCreatingShipment } = useShipments({
    getAllShipments: true,
  });

  const {
    data: generatedShipmentRefNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["shipment-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateShipmentRefNumber();
      return result;
    },
    enabled: mode === "create",
  });

  // Base default values for form reset
  const baseDefaultValues = useCallback(
    () => ({
      shipmentRefNumber: generatedShipmentRefNumber || "",
      numberOfPackages: 0,
      totalItems: 0,
      shippingMode: ShippingMode.Air,
      shipperType: ShipperType.Vendor,
      shippingVendorId: undefined,
      shipperName: undefined,
      shipperAddress: undefined,
      carrierType: CarrierType.AirCargo,
      carrierName: "",
      trackingNumber: "",
      shippingDate: new Date(),
      dateShipped: null,
      estimatedArrivalDate: null,
      actualArrivalDate: null,
      totalAmount: 0,
      status: ShipmentStatus.Pending,
      originPort: "",
      destinationPort: "",
      containerNumber: "",
      flightNumber: "",
      notes: "",
      attachments: [],
      purchaseIds: [],
      vendorIds: [],
      tempParcelNumber: "",
      tempPackageType: PackageType.Box,
      tempLength: 0,
      tempWidth: 0,
      tempHeight: 0,
      tempNetWeight: 0,
      tempGrossWeight: 0,
      tempVolumetricDivisor: 5000,
      tempUnitPricePerKg: 0,
      tempDescription: "",
      parcels: [],
    }),
    [generatedShipmentRefNumber]
  );

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(ShipmentFormValidation),
    mode: "all",
    defaultValues:
      mode === "create"
        ? baseDefaultValues()
        : {
            shipmentRefNumber: initialData?.shipment.shipmentRefNumber || "",
            numberOfPackages: initialData?.shipment?.numberOfPackages || 0,
            totalItems: initialData?.shipment.totalItems || 0,
            shippingMode:
              initialData?.shipment.shippingMode || ShippingMode.Air,
            shipperType:
              initialData?.shipment.shipperType || ShipperType.Vendor,
            shippingVendorId:
              initialData?.shipment.shippingVendorId || undefined,
            shipperName: initialData?.shipment.shipperName || undefined,
            shipperAddress: initialData?.shipment.shipperAddress || undefined,
            carrierType:
              initialData?.shipment.carrierType || CarrierType.AirCargo,
            carrierName: initialData?.shipment.carrierName || "",
            trackingNumber: initialData?.shipment.trackingNumber || "",
            shippingDate: initialData?.shipment.shippingDate
              ? new Date(initialData?.shipment.shippingDate)
              : new Date(),
            dateShipped: initialData?.shipment.dateShipped
              ? new Date(initialData?.shipment.dateShipped)
              : null,
            estimatedArrivalDate: initialData?.shipment.estimatedArrivalDate
              ? new Date(initialData?.shipment.estimatedArrivalDate)
              : null,
            actualArrivalDate: initialData?.shipment.actualArrivalDate
              ? new Date(initialData?.shipment.actualArrivalDate)
              : null,
            totalAmount: initialData?.shipment.totalAmount || 0,
            status: initialData?.shipment.status || ShipmentStatus.Pending,
            originPort: initialData?.shipment.originPort || "",
            destinationPort: initialData?.shipment.destinationPort || "",
            containerNumber: initialData?.shipment.containerNumber || "",
            flightNumber: initialData?.shipment.flightNumber || "",
            notes: initialData?.shipment.notes || "",
            attachments: initialData?.shipment.attachments || [],
            purchaseIds: initialData?.shipment.purchaseIds || [],
            vendorIds: initialData?.shipment.vendorIds || [],
            parcels: initialData?.parcels || [],
            tempParcelNumber: "",
            tempPackageType: PackageType.Box,
            tempLength: 0,
            tempWidth: 0,
            tempHeight: 0,
            tempNetWeight: 0,
            tempGrossWeight: 0,
            tempVolumetricDivisor:
              initialData?.shipment.shippingMode === ShippingMode.Air ||
              initialData?.shipment.shippingMode === ShippingMode.Express
                ? 5000
                : 6000,
            tempUnitPricePerKg: 0,
            tempDescription: "",
          },
  });

  const {
    fields: parcelFields,
    append: appendParcel,
    remove: removeParcel,
    update: updateParcelField,
  } = useFieldArray({
    control: form.control,
    name: "parcels",
  });

  const shippingMode = form.watch("shippingMode");
  const carrierType = form.watch("carrierType");
  const shipperType = form.watch("shipperType");
  const selectedVendorIds = form.watch("vendorIds");
  const selectedPurchaseIds = form.watch("purchaseIds");

  // Derive volumetric divisor based on shipping mode
  const currentVolumetricDivisor =
    shippingMode === ShippingMode.Air || shippingMode === ShippingMode.Express
      ? 5000
      : 6000;

  useEffect(() => {
    form.setValue("numberOfPackages", parcelFields.length);
  }, [parcelFields.length, form]);

  useEffect(() => {
    if (generatedShipmentRefNumber && mode === "create") {
      form.setValue("shipmentRefNumber", generatedShipmentRefNumber);
      form.setValue("tempVolumetricDivisor", currentVolumetricDivisor);
    }
  }, [form, mode, generatedShipmentRefNumber, currentVolumetricDivisor]);

  // Update tempVolumetricDivisor when shippingMode changes
  useEffect(() => {
    form.setValue("tempVolumetricDivisor", currentVolumetricDivisor);
  }, [form, currentVolumetricDivisor]);

  // Filter available purchases by selected vendor IDs and quantity to ship
  const availablePurchases = useCallback(() => {
    return purchases?.filter((purchase: PurchaseWithRelations) => {
      const hasRemainingQuantity = purchase.products.some(
        (product) => product.quantity - product.quantityReceived > 0
      );
      const matchesSelectedVendor =
        selectedVendorIds.length === 0 ||
        selectedVendorIds.includes(purchase.purchase.vendorId);
      return hasRemainingQuantity && matchesSelectedVendor;
    });
  }, [purchases, selectedVendorIds]);

  // Validate and update selectedPurchaseIds when selectedVendorIds change
  useEffect(() => {
    if (!selectedPurchaseIds || selectedPurchaseIds.length === 0) return;

    const validPurchaseIds = new Set(
      availablePurchases()?.map((p: PurchaseWithRelations) => p.purchase.id)
    );
    const newSelectedPurchaseIds = selectedPurchaseIds.filter((purchaseId) =>
      validPurchaseIds.has(purchaseId)
    );

    if (
      JSON.stringify(newSelectedPurchaseIds) !==
      JSON.stringify(selectedPurchaseIds)
    ) {
      form.setValue("purchaseIds", newSelectedPurchaseIds, {
        shouldValidate: true,
      });
      toast.error("Some selected purchases were removed due to vendor filter.");
    }
  }, [selectedVendorIds, availablePurchases, form, selectedPurchaseIds]);

  // Get available purchase items for adding to parcels
  const getAvailablePurchaseItems = useCallback(() => {
    const availableItems: Array<{
      id: string;
      productId: string;
      productName: string;
      productID: string;
      productUnit: string;
      quantity: number;
      purchaseNumber: string;
    }> = [];

    selectedPurchaseIds?.forEach((purchaseId) => {
      const purchase = availablePurchases()?.find(
        (p: PurchaseWithRelations) => p.purchase.id === purchaseId
      );
      if (purchase) {
        purchase.products.forEach((item: PurchaseItem) => {
          const quantityToShip = item.quantity - item.quantityReceived;
          const unit = products.find(
            (p: ProductWithRelations) =>
              p.product.id == item.productId &&
              p.product.productID === item.productID
          )?.unit;
          if (item.quantityReceived < item.quantity && quantityToShip > 0) {
            availableItems.push({
              id: `${purchase.purchase.id}-${item.productId}`,
              productId: item.productId,
              productName: item.productName,
              productID: item.productID,
              productUnit: unit.code,
              quantity: quantityToShip,
              purchaseNumber: purchase.purchase.purchaseNumber,
            });
          }
        });
      }
    });

    return availableItems;
  }, [availablePurchases, products, selectedPurchaseIds]);

  const vendorOptions: MultiSelectOption[] =
    vendors?.map((vendor: Vendor) => ({
      value: vendor.id,
      label: vendor.name,
    })) || [];

  const purchaseOptions: MultiSelectOption[] =
    availablePurchases()?.map((purchase: PurchaseWithRelations) => ({
      value: purchase.purchase.id,
      label: `${purchase.purchase.purchaseNumber} - ${purchase.purchase.vendorInvoiceNumber}`,
    })) || [];

  const handleRefreshShipmentRefNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedShipmentRefNumber) {
          form.setValue("shipmentRefNumber", generatedShipmentRefNumber);
        }
      } catch (error) {
        console.error("Error refreshing shipment numbers:", error);
        toast.error("Failed to refresh shipment numbers");
      }
    }
  };

  const handleAddItemToParcel = () => {
    let newItem = null;

    if (newItemForm.isPurchaseItem) {
      if (
        !newItemForm.selectedPurchaseItem ||
        newItemForm.quantity <= 0 ||
        newItemForm.netWeight <= 0
      ) {
        toast.error(
          "Please select a purchase item, a valid quantity, and a valid net weight per unit."
        );
        return;
      }
      const selectedItem = getAvailablePurchaseItems().find(
        (item) => item.id === newItemForm.selectedPurchaseItem
      );
      if (!selectedItem || newItemForm.quantity > selectedItem.quantity) {
        toast.error(
          "Quantity exceeds available quantity for this purchase item."
        );
        return;
      }

      // Check for duplication for purchase items by productID and purchaseReference
      const isDuplicatePurchaseItem = currentParcelItems.some(
        (item) =>
          item.productID === selectedItem.productID &&
          item.isPurchaseItem &&
          item.purchaseReference === selectedItem.purchaseNumber
      );
      if (isDuplicatePurchaseItem) {
        toast.error(
          `Item "${selectedItem.productID}" from purchase "${selectedItem.purchaseNumber}" is already in this package.`
        );
        return;
      }

      newItem = {
        productId: selectedItem.productId,
        productName: selectedItem.productName,
        productID: selectedItem.productID,
        productUnit: newItemForm.productUnit,
        quantity: newItemForm.quantity,
        netWeight: newItemForm.netWeight,
        isPurchaseItem: true,
        purchaseReference: selectedItem.purchaseNumber,
      };
    } else {
      // Custom item
      if (!newItemForm.productID || !newItemForm.productName) {
        toast.error("Product ID and Product Name are required.");
        return;
      }
      if (newItemForm.quantity <= 0 || newItemForm.netWeight <= 0) {
        toast.error("Quantity and Net Weight must be greater than 0.");
        return;
      }

      // Check for duplication for custom items by productID
      const isDuplicateCustomItem = currentParcelItems.some(
        (item) =>
          item.productID === newItemForm.productID && !item.isPurchaseItem
      );
      if (isDuplicateCustomItem) {
        toast.error(
          `A custom item with Product ID "${newItemForm.productID}" is already in this package.`
        );
        return;
      }

      newItem = {
        productName: newItemForm.productName,
        productID: newItemForm.productID,
        productUnit: newItemForm.productUnit,
        quantity: newItemForm.quantity,
        netWeight: newItemForm.netWeight,
        isPurchaseItem: false,
      };
    }

    if (newItem) {
      setCurrentParcelItems((prev) => [...prev, newItem!]);
      toast.success("Item added to package successfully!");
    }

    // Reset item form fields
    setNewItemForm({
      productName: "",
      productID: "",
      productUnit: "",
      quantity: 0,
      netWeight: 0,
      isPurchaseItem: false,
      selectedPurchaseItem: "",
    });
    setShowAddItemForm(false);
  };

  const handleRemoveParcelItem = (
    productID: string,
    isPurchaseItem: boolean,
    purchaseReference?: string
  ) => {
    setCurrentParcelItems((prev) =>
      prev.filter((item) => {
        if (item.productID !== productID) return true;
        if (item.isPurchaseItem !== isPurchaseItem) return true;
        if (isPurchaseItem && item.purchaseReference !== purchaseReference)
          return true;
        return false;
      })
    );
    toast.success("Item removed from package");
  };

  const handleSaveParcel = () => {
    const parcelNum =
      form.getValues("tempParcelNumber") ||
      `PKG-${String(parcelFields.length + 1).padStart(3, "0")}`;
    const pkgType = form.getValues("tempPackageType");
    const len = form.getValues("tempLength") ?? 0;
    const wid = form.getValues("tempWidth") ?? 0;
    const hgt = form.getValues("tempHeight") ?? 0;
    const grossW = form.getValues("tempGrossWeight") ?? 0;
    const volDivisor = form.getValues("tempVolumetricDivisor") ?? 5000;
    const unitPricePerKg = form.getValues("tempUnitPricePerKg") ?? 0;
    const desc = form.getValues("tempDescription");

    // Calculate total net weight from items in the parcel
    const totalItemsNetWeight = currentParcelItems.reduce(
      (sum, item) => sum + item.netWeight,
      0
    );

    // Validate inputs
    if (!parcelNum || !pkgType) {
      toast.error("Package number and type are required.");
      return;
    }
    if (len <= 0 || wid <= 0 || hgt <= 0) {
      toast.error("Dimensions (Length, Width, Height) must be greater than 0.");
      return;
    }
    if (grossW <= 0) {
      toast.error("Gross Weight must be greater than 0.");
      return;
    }
    if (grossW < totalItemsNetWeight) {
      toast.error(
        `Gross Weight (${grossW.toFixed(
          3
        )}kg) cannot be less than the total net weight of items (${totalItemsNetWeight.toFixed(
          3
        )}kg).`
      );
      return;
    }
    if (currentParcelItems.length === 0) {
      toast.error("Please add at least one item to this package.");
      return;
    }
    if (unitPricePerKg <= 0) {
      toast.error("Unit Price/kg must be greater than 0.");
      return;
    }

    const volumetricWeight = (len * wid * hgt) / volDivisor;
    const chargeableWeight = Math.max(grossW, volumetricWeight);
    const totalAmount = unitPricePerKg * chargeableWeight;

    const parcelData = {
      parcelNumber: parcelNum,
      packageType: pkgType,
      length: len,
      width: wid,
      height: hgt,
      netWeight: totalItemsNetWeight,
      grossWeight: grossW,
      volumetricWeight,
      chargeableWeight,
      volumetricDivisor: volDivisor,
      unitPricePerKg,
      totalAmount,
      description: desc || "",
      items: currentParcelItems.map((item) => ({
        productId: item.productId || "",
        productName: item.productName,
        productID: item.productID,
        productUnit: item.productUnit,
        quantity: item.quantity,
        netWeight: item.netWeight,
        isPurchaseItem: item.isPurchaseItem,
        purchaseReference: item.purchaseReference || "",
      })),
    };

    if (editingParcelIndex !== null) {
      updateParcelField(editingParcelIndex, parcelData);
      toast.success("Package updated successfully!");
    } else {
      appendParcel(parcelData);
      toast.success("Package added successfully!");
    }

    // Reset parcel form state
    setCurrentParcelItems([]);
    setIsAddingParcel(false);
    setShowAddItemForm(false);
    setEditingParcelIndex(null);

    form.setValue("tempParcelNumber", "");
    form.setValue("tempPackageType", PackageType.Box);
    form.setValue("tempLength", 0);
    form.setValue("tempWidth", 0);
    form.setValue("tempHeight", 0);
    form.setValue("tempNetWeight", 0);
    form.setValue("tempGrossWeight", 0);
    form.setValue("tempVolumetricDivisor", currentVolumetricDivisor);
    form.setValue("tempUnitPricePerKg", 0);
    form.setValue("tempDescription", "");
  };

  const handleEditParcel = (index: number) => {
    const parcelToEdit = parcelFields[index];

    form.setValue("tempParcelNumber", parcelToEdit.parcelNumber);
    form.setValue("tempPackageType", parcelToEdit.packageType);
    form.setValue("tempLength", parcelToEdit.length);
    form.setValue("tempWidth", parcelToEdit.width);
    form.setValue("tempHeight", parcelToEdit.height);
    form.setValue("tempGrossWeight", parcelToEdit.grossWeight);
    form.setValue("tempVolumetricDivisor", parcelToEdit.volumetricDivisor);
    form.setValue("tempUnitPricePerKg", parcelToEdit.unitPricePerKg || 0);
    form.setValue("tempDescription", parcelToEdit.description || "");

    setCurrentParcelItems(parcelToEdit.items);

    setIsAddingParcel(true);
    setEditingParcelIndex(index);
    setShowAddItemForm(false);
  };

  const handleCancelParcelEdit = () => {
    setIsAddingParcel(false);
    setEditingParcelIndex(null);
    setCurrentParcelItems([]);
    setShowAddItemForm(false);

    // Reset temporary form values
    form.setValue("tempParcelNumber", "");
    form.setValue("tempPackageType", PackageType.Box);
    form.setValue("tempLength", 0);
    form.setValue("tempWidth", 0);
    form.setValue("tempHeight", 0);
    form.setValue("tempNetWeight", 0);
    form.setValue("tempGrossWeight", 0);
    form.setValue("tempVolumetricDivisor", currentVolumetricDivisor);
    form.setValue("tempUnitPricePerKg", 0);
    form.setValue("tempDescription", "");
  };

  const validateShipmentRefNumber = (shipmentRefNumber: string) => {
    const existingShipment = shipments?.find(
      (shipment: ShipmentWithRelations) =>
        shipment.shipment.shipmentRefNumber === shipmentRefNumber
    );
    if (mode === "create" && existingShipment) return false;

    if (
      mode === "edit" &&
      initialData?.shipment.shipmentRefNumber !== shipmentRefNumber &&
      existingShipment
    )
      return false;
    return true;
  };

  const calculateTotals = useCallback(() => {
    const totalNetWeight = parcelFields.reduce(
      (total, parcel) => total + parcel.netWeight,
      0
    );
    const totalGrossWeight = parcelFields.reduce(
      (total, parcel) => total + parcel.grossWeight,
      0
    );
    const totalVolumetricWeight = parcelFields.reduce(
      (total, parcel) => total + parcel.volumetricWeight,
      0
    );
    const totalChargeableWeight = parcelFields.reduce(
      (total, parcel) => total + parcel.chargeableWeight,
      0
    );
    const totalItems = parcelFields.reduce(
      (total, parcel) => total + parcel.items.length,
      0
    );
    const totalShipmentAmount = parcelFields.reduce(
      (total, parcel) => total + (parcel.totalAmount || 0),
      0
    );

    form.setValue("numberOfPackages", parcelFields.length);
    form.setValue("totalAmount", totalShipmentAmount);
    form.setValue("totalItems", totalItems);

    return {
      totalNetWeight,
      totalGrossWeight,
      totalVolumetricWeight,
      totalChargeableWeight,
      totalItems,
      totalShipmentAmount,
    };
  }, [form, parcelFields]);

  const totals = calculateTotals();

  // Update totalAmount in the form when parcels change
  useEffect(() => {
    form.setValue("totalAmount", totals.totalShipmentAmount);
  }, [totals.totalShipmentAmount, form]);

  const getCarrierOptions = () => {
    if (shippingMode === ShippingMode.Air) {
      return (
        CARRIER_OPTIONS[ShippingMode.Air][
          carrierType as CarrierType.AirCargo
        ] || []
      );
    } else if (shippingMode === ShippingMode.Sea) {
      return (
        CARRIER_OPTIONS[ShippingMode.Sea][
          carrierType as CarrierType.SeaCargo
        ] || []
      );
    } else if (shippingMode === ShippingMode.Express) {
      return (
        CARRIER_OPTIONS[ShippingMode.Express][
          carrierType as CarrierType.ExpressCargo
        ] ||
        CARRIER_OPTIONS[ShippingMode.Express][CarrierType.AirCargo] ||
        []
      );
    }
    return [];
  };

  const handleSubmit = async () => {
    try {
      const values = form.getValues();

      if (!validateShipmentRefNumber(values.shipmentRefNumber)) {
        toast.error("A shipment with the same shipment number already exists.");
        return;
      }

      if (values.purchaseIds.length === 0) {
        toast.error("Please add at least one purchase to the shipment.");
        return;
      }

      if (values.parcels.length === 0) {
        toast.error("Please add at least one package to the shipment.");
        return;
      }

      if (mode === "create") {
        await addShipment(values, {
          onSuccess: () => {
            toast.success("Shipment created successfully!");
            form.reset();
            router.push("/purchases/shipping-list");
          },
          onError: (error) => {
            console.error("Create shipment order error:", error);
            toast.error("Failed to create shipment order");
          },
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form.");
    }
  };

  const handleCancel = () => {
    if (mode === "create") {
      form.reset(baseDefaultValues());
      setCurrentParcelItems([]);
      setIsAddingParcel(false);
      setShowAddItemForm(false);
      setEditingParcelIndex(null);
      refetch();
    } else {
      // For edit mode, reset to initialData if available
      if (initialData) {
        form.reset({
          shipmentRefNumber: initialData?.shipment.shipmentRefNumber || "",
          numberOfPackages: initialData?.shipment?.numberOfPackages || 0,
          totalItems: initialData?.shipment.totalItems || 0,
          shippingMode: initialData?.shipment.shippingMode || ShippingMode.Air,
          shipperType: initialData?.shipment.shipperType || ShipperType.Vendor,
          shippingVendorId: initialData?.shipment.shippingVendorId || undefined,
          shipperName: initialData?.shipment.shipperName || undefined,
          shipperAddress: initialData?.shipment.shipperAddress || undefined,
          carrierType:
            initialData?.shipment.carrierType || CarrierType.AirCargo,
          carrierName: initialData?.shipment.carrierName || "",
          trackingNumber: initialData?.shipment.trackingNumber || "",
          shippingDate: initialData?.shipment.shippingDate
            ? new Date(initialData?.shipment.shippingDate)
            : new Date(),
          dateShipped: initialData?.shipment.dateShipped
            ? new Date(initialData?.shipment.dateShipped)
            : null,
          estimatedArrivalDate: initialData?.shipment.estimatedArrivalDate
            ? new Date(initialData?.shipment.estimatedArrivalDate)
            : null,
          actualArrivalDate: initialData?.shipment.actualArrivalDate
            ? new Date(initialData?.shipment.actualArrivalDate)
            : null,
          totalAmount: initialData?.shipment.totalAmount || 0,
          status: initialData?.shipment.status || ShipmentStatus.Pending,
          originPort: initialData?.shipment.originPort || "",
          destinationPort: initialData?.shipment.destinationPort || "",
          containerNumber: initialData?.shipment.containerNumber || "",
          flightNumber: initialData?.shipment.flightNumber || "",
          notes: initialData?.shipment.notes || "",
          attachments: initialData?.shipment.attachments || [],
          parcels: initialData?.parcels || [],
          purchaseIds: initialData?.shipment.purchaseIds || [],
          vendorIds: initialData?.shipment.vendorIds || [],
          tempParcelNumber: "",
          tempPackageType: PackageType.Box,
          tempLength: 0,
          tempWidth: 0,
          tempHeight: 0,
          tempNetWeight: 0,
          tempGrossWeight: 0,
          tempVolumetricDivisor:
            initialData?.shipment.shippingMode === ShippingMode.Air ||
            initialData?.shipment.shippingMode === ShippingMode.Express
              ? 5000
              : 6000,
          tempUnitPricePerKg: 0,
          tempDescription: "",
        });

        setCurrentParcelItems([]);
        setIsAddingParcel(false);
        setShowAddItemForm(false);
        setEditingParcelIndex(null);
      }
    }
    toast.error("Form changes discarded.");
  };

  const closeDialog = () => {
    setVendorDialogOpen(false);
    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  const totalItemsNetWeightInCurrentParcel = currentParcelItems.reduce(
    (sum, item) => sum + item.netWeight,
    0
  );

  // Calculate totalAmountInCurrentParcel for display
  const tempLength = form.watch("tempLength") ?? 0;
  const tempWidth = form.watch("tempWidth") ?? 0;
  const tempHeight = form.watch("tempHeight") ?? 0;
  const tempGrossWeight = form.watch("tempGrossWeight") ?? 0;
  const tempVolumetricDivisor =
    form.watch("tempVolumetricDivisor") ?? currentVolumetricDivisor;
  const tempUnitPricePerKg = form.watch("tempUnitPricePerKg") ?? 0;

  const volumetricWeightInCurrentParcel =
    tempLength > 0 &&
    tempWidth > 0 &&
    tempHeight > 0 &&
    tempVolumetricDivisor > 0
      ? (tempLength * tempWidth * tempHeight) / tempVolumetricDivisor
      : 0;
  const chargeableWeightInCurrentParcel = Math.max(
    tempGrossWeight,
    volumetricWeightInCurrentParcel
  );
  const totalAmountInCurrentParcel =
    tempUnitPricePerKg > 0 && chargeableWeightInCurrentParcel > 0
      ? tempUnitPricePerKg * chargeableWeightInCurrentParcel
      : 0;

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 text-dark-500"
        >
          {/* Basic Information */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Package className="h-5 w-5" />
                Shipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-row gap-2 items-center">
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="shipmentRefNumber"
                    label="Shipment Reference No."
                    placeholder={
                      isLoading || isRefetching
                        ? "Generating..."
                        : "Enter shipment reference number"
                    }
                    disabled={mode === "edit" || isLoading || isRefetching}
                  />
                  {mode === "create" && (
                    <Button
                      type="button"
                      size={"icon"}
                      onClick={handleRefreshShipmentRefNumber}
                      className="self-end shad-primary-btn px-5"
                      disabled={isLoading || isRefetching}
                    >
                      <RefreshCw
                        className={`h-5 w-5 ${
                          isLoading || isRefetching ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  )}
                </div>
                <CustomFormField
                  fieldType={FormFieldType.DATE_PICKER}
                  control={form.control}
                  name="shippingDate"
                  label="Shipping Date"
                  dateFormat="MM/dd/yyyy"
                />
              </div>
            </CardContent>
          </Card>

          {/* Freight Details Section */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Truck className="h-5 w-5" />
                Freight Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={form.control}
                  name="shippingMode"
                  label="Shipping Mode"
                  placeholder="Select shipping mode"
                  onValueChange={(value) => {
                    form.setValue("shippingMode", value as ShippingMode);
                    form.setValue(
                      "carrierType",
                      value === ShippingMode.Air
                        ? CarrierType.AirCargo
                        : value === ShippingMode.Sea
                        ? CarrierType.SeaCargo
                        : CarrierType.ExpressCargo
                    );
                    form.setValue("carrierName", "");
                    form.setValue("originPort", "");
                    form.setValue("destinationPort", "");
                    form.setValue("containerNumber", "");
                    form.setValue("flightNumber", "");
                    form.setValue(
                      "tempVolumetricDivisor",
                      value === ShippingMode.Air ||
                        value === ShippingMode.Express
                        ? 5000
                        : 6000
                    );
                  }}
                >
                  {Object.values(ShippingMode).map((method) => (
                    <SelectItem
                      key={method}
                      value={method}
                      className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                    >
                      <div className="flex items-center gap-2">
                        {method === ShippingMode.Air ? (
                          <Plane className="h-4 w-4" />
                        ) : method === ShippingMode.Sea ? (
                          <Ship className="h-4 w-4" />
                        ) : (
                          <Truck className="h-4 w-4" />
                        )}
                        {method === ShippingMode.Air
                          ? "Air Cargo"
                          : method === ShippingMode.Sea
                          ? "Sea Cargo"
                          : "Express Cargo"}
                      </div>
                    </SelectItem>
                  ))}
                </CustomFormField>

                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={form.control}
                  name="carrierName"
                  label="Type of shipment / Shipping Line"
                  placeholder="Select carrier"
                  disabled={getCarrierOptions().length === 0}
                >
                  {getCarrierOptions().map((carrier) => (
                    <SelectItem
                      key={carrier.value}
                      value={carrier.value}
                      className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                    >
                      {carrier.label}
                    </SelectItem>
                  ))}
                </CustomFormField>

                <div
                  className={cn(
                    "grid grid-cols-1 md:col-span-2 gap-5",
                    shipperType === ShipperType.Courier && "md:grid-cols-3",
                    shipperType === ShipperType.Vendor && "md:grid-cols-2"
                  )}
                >
                  <CustomFormField
                    fieldType={FormFieldType.SELECT}
                    control={form.control}
                    name="shipperType"
                    label="Shipper Type"
                    placeholder="Select shipper type"
                    onValueChange={(value) => {
                      form.setValue("shipperType", value as ShipperType);
                      form.setValue("shippingVendorId", undefined);
                      form.setValue("shipperName", undefined);
                      form.setValue("shipperAddress", undefined);
                    }}
                  >
                    {Object.values(ShipperType).map((shipper) => (
                      <SelectItem
                        key={shipper}
                        value={shipper}
                        className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                      >
                        {shipper}
                      </SelectItem>
                    ))}
                  </CustomFormField>

                  {shipperType === ShipperType.Vendor && (
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name="shippingVendorId"
                      label="Select Shipper"
                      placeholder="Select shipper"
                      key={`vendor-select-${
                        form.watch("shippingVendorId") || ""
                      }`}
                      onAddNew={() => setVendorDialogOpen(true)}
                    >
                      {vendorsLoading && (
                        <div className="py-4">
                          <Loading />
                        </div>
                      )}
                      {vendors?.map((vendor: Vendor) => (
                        <SelectItem
                          key={vendor.id}
                          value={vendor.id}
                          className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                        >
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </CustomFormField>
                  )}

                  {shipperType === ShipperType.Courier && (
                    <>
                      <CustomFormField
                        fieldType={FormFieldType.INPUT}
                        control={form.control}
                        name="shipperName"
                        label="Shipper Name"
                        placeholder="Enter sipper name"
                      />
                      <CustomFormField
                        fieldType={FormFieldType.INPUT}
                        control={form.control}
                        name="shipperAddress"
                        label="Shipper Address"
                        placeholder="Enter shipper address"
                      />
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 md:col-span-2 gap-5">
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="trackingNumber"
                    label="Tracking Number"
                    placeholder="Enter tracking number"
                  />

                  <CustomFormField
                    fieldType={FormFieldType.DATE_PICKER}
                    control={form.control}
                    name="dateShipped"
                    label="Date Shipped"
                    dateFormat="MM/dd/yyyy"
                  />

                  <CustomFormField
                    fieldType={FormFieldType.DATE_PICKER}
                    control={form.control}
                    name="estimatedArrivalDate"
                    label="Arrival Date"
                    dateFormat="MM/dd/yyyy"
                  />
                </div>
              </div>
              {shippingMode === ShippingMode.Sea && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="originPort"
                    label="Origin Port"
                    placeholder="e.g., Shanghai Port"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="destinationPort"
                    label="Destination Port"
                    placeholder="e.g., Tema Port"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="containerNumber"
                    label="Container Number"
                    placeholder="e.g., MSKU1234567"
                  />
                </div>
              )}
              {(shippingMode === ShippingMode.Air ||
                shippingMode === ShippingMode.Express) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="originPort"
                    label="Origin Airport"
                    placeholder="e.g., Shanghai Pudong (PVG)"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="destinationPort"
                    label="Destination Airport"
                    placeholder="e.g., Kotoka International (ACC)"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="flightNumber"
                    label="Flight Number"
                    placeholder="e.g., EK787"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Selection */}
          <Card className="bg-white">
            <CardHeader className="text-blue-800">
              <CardTitle>Purchase Orders to Ship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-5">
                <CustomFormField
                  fieldType={FormFieldType.MULTI_SELECT}
                  control={form.control}
                  name="vendorIds"
                  label="Filter by Vendors"
                  placeholder={`${
                    vendorsLoading ? "Loading" : "Select vendors"
                  }`}
                  options={vendorOptions}
                  multiSelectProps={{
                    searchable: true,
                    closeOnSelect: false,
                    maxCount: 3,
                    className: "overflow-hidden text-blue-800",
                  }}
                  disabled={vendorsLoading}
                />

                <CustomFormField
                  fieldType={FormFieldType.MULTI_SELECT}
                  control={form.control}
                  name="purchaseIds"
                  label="Select Purchase Orders"
                  placeholder={
                    selectedVendorIds.length === 0
                      ? "Select vendors first"
                      : "Select purchase orders"
                  }
                  options={purchaseOptions}
                  multiSelectProps={{
                    searchable: true,
                    closeOnSelect: false,
                    maxCount: 3,
                    className: "overflow-hidden text-blue-800",
                  }}
                  disabled={selectedVendorIds.length === 0 || purchasesLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cargo Details Section */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-blue-800">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Cargo Details
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsAddingParcel(true);
                    setEditingParcelIndex(null);
                    // Reset temporary form fields for new parcel
                    form.setValue("tempParcelNumber", "");
                    form.setValue("tempPackageType", PackageType.Box);
                    form.setValue("tempLength", 0);
                    form.setValue("tempWidth", 0);
                    form.setValue("tempHeight", 0);
                    form.setValue("tempGrossWeight", 0);
                    form.setValue(
                      "tempVolumetricDivisor",
                      currentVolumetricDivisor
                    );
                    form.setValue("tempUnitPricePerKg", 0);
                    form.setValue("tempDescription", "");
                    setCurrentParcelItems([]);
                  }}
                  className="flex items-center gap-2 shad-primary-btn"
                  disabled={selectedPurchaseIds.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Add Package
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10 text-blue-800">
              {/* Cargo Summary */}
              {parcelFields.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-7 gap-5">
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Total Packages
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {parcelFields.length}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Total Items
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {totals.totalItems}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Volumetric Divisor
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {currentVolumetricDivisor}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Volumetric Weight
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {totals.totalVolumetricWeight.toFixed(3)} kg
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Total Gross Weight
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {totals.totalGrossWeight.toFixed(3)} kg
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Chargeable Weight
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {totals.totalChargeableWeight.toFixed(3)} kg
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center flex flex-col gap-2">
                    <Label className="font-medium text-blue-800">
                      Total Shipment Amount
                    </Label>
                    <p className="text-lg font-bold text-blue-900">
                      {totals.totalShipmentAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Package List */}
              {parcelFields.map((parcel, index) => (
                <Card key={parcel.id} className="border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-sm font-semibold">
                      Package {index + 1}/{parcelFields.length}:{" "}
                      {parcel.parcelNumber}
                    </CardTitle>
                    <div className="flex flex-row items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditParcel(index)}
                        className="text-blue-800/90 hover:text-blue-800 bg-blue-100 hover:bg-blue-200"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParcel(index)}
                        className="text-red-600 hover:text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        <DeleteIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Package Type
                        </Label>
                        <p className="font-semibold">{parcel.packageType}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Dimensions (cm)
                        </Label>
                        <p className="font-semibold">
                          {parcel.length} × {parcel.width} × {parcel.height}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Net Weight
                        </Label>
                        <p className="font-semibold">
                          {parcel.netWeight.toFixed(3)} kg
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Gross Weight
                        </Label>
                        <p className="font-semibold">
                          {parcel.grossWeight.toFixed(3)} kg
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm pt-4">
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Volumetric Weight
                        </Label>
                        <p className="font-semibold">
                          {parcel.volumetricWeight.toFixed(3)} kg
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Chargeable Weight
                        </Label>
                        <p className="font-semibold text-blue-800">
                          {parcel.chargeableWeight.toFixed(3)} kg
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Volumetric Divisor
                        </Label>
                        <p className="font-semibold">
                          {parcel.volumetricDivisor}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Unit Price/kg
                        </Label>
                        <p className="font-semibold">
                          {parcel.unitPricePerKg.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-blue-800 font-medium">
                          Total Amount
                        </Label>
                        <p className="font-semibold text-blue-800">
                          {parcel.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {parcel.description && (
                      <div className="flex flex-col gap-2 py-2">
                        <Label className="text-blue-800 font-medium">
                          Description
                        </Label>
                        <p className="text-sm">{parcel.description}</p>
                      </div>
                    )}

                    {/* Items Table */}
                    {parcel.items.length > 0 && (
                      <div className="pt-5">
                        <h4 className="font-semibold mb-3">
                          Items in this package ({parcel.items.length}):
                        </h4>
                        <Table className="border border-light-200 rounded-lg shad-table">
                          <TableHeader>
                            <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                              <TableHead>#</TableHead>
                              <TableHead>Product ID</TableHead>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Net Wt</TableHead>
                              <TableHead>Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="w-full bg-white text-blue-800">
                            {parcel.items.map((item, itemIndex) => (
                              <TableRow
                                key={`${item.productID}-${
                                  item.isPurchaseItem
                                    ? item.purchaseReference
                                    : "custom"
                                }-${itemIndex}`}
                                className={cn("w-full", {
                                  "bg-blue-50": itemIndex % 2 === 1,
                                })}
                              >
                                <TableCell>{itemIndex + 1}</TableCell>
                                <TableCell className="font-mono">
                                  {item.productID}
                                </TableCell>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>
                                  {item.netWeight.toFixed(3)} kg
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      item.isPurchaseItem
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {item.isPurchaseItem
                                      ? item.purchaseReference
                                      : "Custom"}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add new parcel/package */}
              {isAddingParcel && (
                <Card className="border-2 border-dashed border-blue-300">
                  <CardHeader>
                    <CardTitle className="font-semibold flex items-center gap-2">
                      {editingParcelIndex !== null
                        ? "Edit Package"
                        : "Add New Package"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CustomFormField
                          fieldType={FormFieldType.INPUT}
                          control={form.control}
                          name="tempParcelNumber"
                          label="Package Number"
                          placeholder={`PKG-${String(
                            parcelFields.length + 1
                          ).padStart(3, "0")}`}
                        />
                        <CustomFormField
                          fieldType={FormFieldType.SELECT}
                          control={form.control}
                          name="tempPackageType"
                          label="Package Type"
                          placeholder="Select package type"
                        >
                          {Object.values(PackageType).map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                            >
                              {type}
                            </SelectItem>
                          ))}
                        </CustomFormField>
                        <CustomFormField
                          fieldType={FormFieldType.NUMBER}
                          control={form.control}
                          name="tempVolumetricDivisor"
                          label="Volumetric Divisor"
                          placeholder={currentVolumetricDivisor.toString()}
                          min={1}
                          disabled={true}
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-blue-800 mb-2 block">
                          Dimensions (cm)
                        </Label>
                        <div className="grid grid-cols-3 gap-4">
                          <CustomFormField
                            fieldType={FormFieldType.NUMBER}
                            control={form.control}
                            name="tempLength"
                            label="Length"
                            placeholder="0.0"
                            min={0}
                          />
                          <CustomFormField
                            fieldType={FormFieldType.NUMBER}
                            control={form.control}
                            name="tempWidth"
                            label="Width"
                            placeholder="0.0"
                            min={0}
                          />
                          <CustomFormField
                            fieldType={FormFieldType.NUMBER}
                            control={form.control}
                            name="tempHeight"
                            label="Height"
                            placeholder="0.0"
                            min={0}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-blue-800 mb-4 block">
                          Weight (kg)
                        </Label>
                        <div className="grid md:grid-cols-2 gap-5">
                          <div className="flex flex-col gap-3 pt-2">
                            <Label className="text-blue-800 font-medium">
                              Net Weight (from items)
                            </Label>
                            <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                              {totalItemsNetWeightInCurrentParcel.toFixed(3)} kg
                            </div>
                          </div>
                          <CustomFormField
                            fieldType={FormFieldType.NUMBER}
                            control={form.control}
                            name="tempGrossWeight"
                            label="Gross Weight (Parcel)"
                            placeholder="0.000"
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-5">
                        <CustomFormField
                          fieldType={FormFieldType.AMOUNT}
                          control={form.control}
                          name="tempUnitPricePerKg"
                          label="Unit Price/kg (for this parcel)"
                          placeholder="0.00"
                          min={0}
                        />

                        <div className="flex flex-col gap-3 pt-2">
                          <Label className="text-blue-800 font-medium">
                            Total Amount
                          </Label>
                          <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                            <FormatNumber
                              value={totalAmountInCurrentParcel.toFixed(2)}
                            />
                          </div>
                        </div>
                      </div>

                      {((form.watch("tempLength") ?? 0) > 0 ||
                        (form.watch("tempWidth") ?? 0) > 0 ||
                        (form.watch("tempHeight") ?? 0) > 0) &&
                        (form.watch("tempVolumetricDivisor") ?? 0) > 0 && (
                          <Alert className="bg-blue-50 border-blue-200">
                            <Calculator className="h-4 w-4" />
                            <AlertDescription className="text-blue-800">
                              <div className="space-y-1">
                                <p>
                                  <strong>Volumetric Weight:</strong>{" "}
                                  {(
                                    ((form.watch("tempLength") ?? 0) *
                                      (form.watch("tempWidth") ?? 0) *
                                      (form.watch("tempHeight") ?? 0)) /
                                    ((form.watch("tempVolumetricDivisor") ??
                                      5000) ||
                                      5000)
                                  ).toFixed(3)}{" "}
                                  kg
                                </p>
                                <p>
                                  <strong>Chargeable Weight:</strong>{" "}
                                  {Math.max(
                                    form.watch("tempGrossWeight") ?? 0,
                                    ((form.watch("tempLength") ?? 0) *
                                      (form.watch("tempWidth") ?? 0) *
                                      (form.watch("tempHeight") ?? 0)) /
                                      ((form.watch("tempVolumetricDivisor") ??
                                        5000) ||
                                        5000)
                                  ).toFixed(3)}{" "}
                                  kg (higher of gross/volumetric)
                                </p>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Package Items</h4>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowAddItemForm(true)}
                            className="flex items-center gap-2 shad-primary-btn"
                          >
                            <Plus className="h-4 w-4" />
                            Add Item
                          </Button>
                        </div>

                        {showAddItemForm && (
                          <Card className="bg-gray-50">
                            <CardHeader>
                              <CardTitle className="text-base">
                                Add Item to Package
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="itemType"
                                    checked={newItemForm.isPurchaseItem}
                                    onChange={() =>
                                      setNewItemForm((prev) => ({
                                        ...prev,
                                        isPurchaseItem: true,
                                        productID: "",
                                        productName: "",
                                        quantity: 0,
                                        netWeight: 0,
                                      }))
                                    }
                                  />
                                  <span>From Purchase Order</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="itemType"
                                    checked={!newItemForm.isPurchaseItem}
                                    onChange={() =>
                                      setNewItemForm((prev) => ({
                                        ...prev,
                                        isPurchaseItem: false,
                                        productID: "",
                                        productName: "",
                                        productUnit: "",
                                        quantity: 0,
                                        netWeight: 0,
                                      }))
                                    }
                                  />
                                  <span>Custom Item</span>
                                </label>
                              </div>

                              {newItemForm.isPurchaseItem ? (
                                <div className="flex flex-col gap-5">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Select Purchase Item
                                      </Label>
                                      <select
                                        className="w-full p-2 border shad-input border-dark-600 rounded-md text-blue-800"
                                        value={newItemForm.selectedPurchaseItem}
                                        onChange={(e) => {
                                          const item =
                                            getAvailablePurchaseItems().find(
                                              (item) =>
                                                item.id === e.target.value
                                            );
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            selectedPurchaseItem:
                                              e.target.value,
                                            quantity: item?.quantity || 0,
                                            productUnit:
                                              item?.productUnit || "",
                                          }));
                                        }}
                                      >
                                        <option
                                          value=""
                                          className="!text-blue-800"
                                        >
                                          Select an item...
                                        </option>
                                        {getAvailablePurchaseItems().map(
                                          (item) => (
                                            <option
                                              key={item.id}
                                              value={item.id}
                                              className="!text-blue-800"
                                            >
                                              {item.productID} -{" "}
                                              {item.productName} (Available:{" "}
                                              {item.quantity})
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="grid md:grid-cols-3 gap-5">
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Quantity
                                      </Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={
                                          getAvailablePurchaseItems().find(
                                            (item) =>
                                              item.id ===
                                              newItemForm.selectedPurchaseItem
                                          )?.quantity || 0
                                        }
                                        value={newItemForm.quantity}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            quantity:
                                              parseInt(e.target.value) || 0,
                                          }))
                                        }
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Net Weight(kg)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={newItemForm.netWeight}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            netWeight:
                                              parseFloat(e.target.value) || 0,
                                          }))
                                        }
                                        placeholder="0.000"
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Unit of Measure
                                      </Label>
                                      <Input
                                        value={newItemForm.productUnit}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            productUnit: e.target.value,
                                          }))
                                        }
                                        placeholder="Enter product name"
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-5">
                                  <div className="grid md:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Product ID
                                      </Label>
                                      <Input
                                        value={newItemForm.productID}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            productID: e.target.value,
                                          }))
                                        }
                                        placeholder="Enter product ID"
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Product Name
                                      </Label>
                                      <Input
                                        value={newItemForm.productName}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            productName: e.target.value,
                                          }))
                                        }
                                        placeholder="Enter product name"
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid md:grid-cols-3 gap-5">
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Quantity
                                      </Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={newItemForm.quantity}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            quantity:
                                              parseInt(e.target.value) || 0,
                                          }))
                                        }
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Net Weight (kg)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={newItemForm.netWeight}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            netWeight:
                                              parseFloat(e.target.value) || 0,
                                          }))
                                        }
                                        placeholder="0.000"
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-4">
                                      <Label className="font-medium">
                                        Unit of Measure
                                      </Label>
                                      <Input
                                        value={newItemForm.productUnit}
                                        onChange={(e) =>
                                          setNewItemForm((prev) => ({
                                            ...prev,
                                            productUnit: e.target.value,
                                          }))
                                        }
                                        placeholder="Enter product name"
                                        className="shad-input border border-dark-600"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleAddItemToParcel}
                                  disabled={
                                    newItemForm.isPurchaseItem
                                      ? !newItemForm.selectedPurchaseItem ||
                                        newItemForm.quantity <= 0 ||
                                        newItemForm.netWeight <= 0
                                      : !newItemForm.productID ||
                                        !newItemForm.productName ||
                                        !newItemForm.productUnit ||
                                        newItemForm.quantity <= 0 ||
                                        newItemForm.netWeight <= 0
                                  }
                                  className="shad-primary-btn"
                                >
                                  Add Item
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddItemForm(false);
                                    setNewItemForm({
                                      productName: "",
                                      productID: "",
                                      productUnit: "",
                                      quantity: 0,
                                      netWeight: 0,
                                      isPurchaseItem: false,
                                      selectedPurchaseItem: "",
                                    });
                                  }}
                                  className="shad-danger-btn"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Table className="border border-light-200 rounded-lg shad-table">
                          <TableHeader>
                            <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                              <TableHead>#</TableHead>
                              <TableHead>Product ID</TableHead>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Units</TableHead>
                              <TableHead>Net Wt</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="w-full bg-white text-blue-800">
                            {currentParcelItems.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={8}
                                  className="text-center py-4 text-muted-foreground"
                                >
                                  No items added to this package
                                </TableCell>
                              </TableRow>
                            ) : (
                              currentParcelItems.map((item, index) => (
                                <TableRow
                                  key={`${item.productID}-${
                                    item.isPurchaseItem
                                      ? item.purchaseReference
                                      : "custom"
                                  }-${index}`}
                                  className={cn("w-full", {
                                    "bg-blue-50": index % 2 === 1,
                                  })}
                                >
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell className="font-mono">
                                    {item.productID}
                                  </TableCell>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>{item.productUnit}</TableCell>
                                  <TableCell>
                                    {item.netWeight.toFixed(3)} kg
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs ${
                                        item.isPurchaseItem
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {item.isPurchaseItem
                                        ? item.purchaseReference
                                        : "Custom"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      onClick={() =>
                                        handleRemoveParcelItem(
                                          item.productID,
                                          item.isPurchaseItem,
                                          item.purchaseReference
                                        )
                                      }
                                      className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                                    >
                                      <DeleteIcon className="h-5 w-5" />
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <CustomFormField
                        fieldType={FormFieldType.TEXTAREA}
                        control={form.control}
                        name="tempDescription"
                        label="Package Description (Optional)"
                        placeholder="Additional notes about this package..."
                      />

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleSaveParcel}
                          className="shad-primary-btn"
                        >
                          {editingParcelIndex !== null
                            ? "Save Changes"
                            : "Add Package"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelParcelEdit}
                          className="shad-danger-btn"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedPurchaseIds.length > 0 &&
                parcelFields.length === 0 &&
                !isAddingParcel && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-yellow-800">
                      Please add at least one package to continue with the
                      shipment.
                    </AlertDescription>
                  </Alert>
                )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="bg-white">
            <CardHeader className="text-blue-800">
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="w-full flex flex-col md:flex-row-reverse md:items-end  gap-5 pt-5">
                <div className="flex flex-col md:flex-row gap-5 flex-1">
                  <CustomFormField
                    fieldType={FormFieldType.SELECT}
                    control={form.control}
                    name="status"
                    label="Shipment Status"
                    placeholder="Select status"
                  >
                    {Object.values(ShipmentStatus).map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                      >
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </CustomFormField>

                  {mode === "edit" &&
                    initialData?.shipment.actualArrivalDate && (
                      <CustomFormField
                        fieldType={FormFieldType.DATE_PICKER}
                        control={form.control}
                        name="actualArrivalDate"
                        label="Actual Arrival Date"
                        dateFormat="MM/dd/yyyy"
                      />
                    )}
                </div>

                <CustomFormField
                  fieldType={FormFieldType.SKELETON}
                  control={form.control}
                  name="attachments"
                  label="Attachments"
                  renderSkeleton={(field) => (
                    <FormControl>
                      <FileUploader
                        files={field.value}
                        onChange={field.onChange}
                        mode={mode}
                        maxFiles={5}
                        accept={{
                          "application/pdf": [".pdf"],
                          "application/msword": [".doc"],
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                            [".docx"],
                        }}
                      />
                    </FormControl>
                  )}
                />
              </div>

              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="notes"
                label="Notes"
                placeholder="Additional shipping notes or instructions"
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={handleCancel}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
            <SubmitButton
              isLoading={isCreatingShipment}
              className="shad-primary-btn"
            >
              {mode === "create" ? "Create Shipment" : "Update Shipment"}
            </SubmitButton>
          </div>
        </form>
      </Form>

      <VendorDialog
        mode="add"
        open={vendorDialogOpen}
        onOpenChange={closeDialog}
      />
    </>
  );
};

export default ShipmentForm;
