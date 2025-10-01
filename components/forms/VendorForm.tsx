"use client";

import { VendorFormValidation, VendorFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Vendor } from "@/types";
import { useVendors } from "@/hooks/useVendors";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { City, Country, ICity, IState, State } from "country-state-city";
import { SelectItem } from "../ui/select";

interface VendorFormProps {
  mode: "create" | "edit";
  initialData?: Vendor;
  onCancel?: () => void;
}

const VendorForm = ({ mode, initialData, onCancel }: VendorFormProps) => {
  const [states, setStates] = useState<IState[]>(() =>
    initialData?.address?.country
      ? State.getStatesOfCountry(initialData?.address?.country)
      : []
  );
  const [cities, setCities] = useState<ICity[]>(() =>
    initialData?.address?.state
      ? City.getCitiesOfState(
          initialData?.address?.country || "",
          initialData?.address?.state
        )
      : []
  );

  const { addVendor, isAddingVendor, editVendor, isEditingVendor } =
    useVendors();

  const router = useRouter();

  const defaultValues = {
    name: "",
    email: "",
    phone: "",
    address: {
      addressName: "",
      address: "",
      city: "",
      state: "",
      country: "",
    },
  };

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(VendorFormValidation),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          address: {
            addressName: initialData.address.addressName || "",
            address: initialData.address.address || "",
            city: initialData.address.city || "",
            state: initialData.address.state || "",
            country: initialData.address.country || "",
          },
        }
      : defaultValues,
  });

  const selectedCountry = form.watch("address.country");
  const selectedState = form.watch("address.state");

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

    form.setValue("address.country", value);
    form.setValue("address.state", "");
    form.setValue("address.city", "");
    form.trigger("address.country");
  };

  // Handle state change
  const handleStateChange = (value: string) => {
    if (!selectedCountry) return;

    const stateCities = City.getCitiesOfState(selectedCountry, value) || [];
    setCities(stateCities);

    form.setValue("address.state", value);
    form.setValue("address.city", "");
    form.trigger("address.state");
  };

  // Set initial values for the form
  useEffect(() => {
    if (initialData) {
      if (initialData.address?.country) {
        const countryStates =
          State.getStatesOfCountry(initialData.address.country) || [];
        setStates(countryStates);

        if (initialData.address?.state) {
          const stateCities =
            City.getCitiesOfState(
              initialData.address.country,
              initialData.address.state
            ) || [];
          setCities(stateCities);
        }
      }

      setTimeout(() => {
        form.reset({
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          address: {
            addressName: initialData.address?.addressName || "",
            address: initialData.address?.address || "",
            city: initialData.address?.city || "",
            state: initialData.address?.state || "",
            country: initialData.address?.country || "",
          },
        });
      }, 100);
    }
  }, [initialData, form]);

  const handleSubmit = async (values: VendorFormValues) => {
    try {
      if (mode === "create") {
        await addVendor(values, {
          onSuccess: () => {
            toast.success("Vendor created successfully!");
            form.reset();
            router.push("/vendors");
            router.refresh();
          },
          onError: (error) => {
            console.error("Create vendor error:", error);
            toast.error("Failed to create vendor");
          },
        });
        onCancel?.();
      } else if (mode === "edit") {
        if (!initialData?.id) {
          throw new Error("Vendor ID is required for editing");
        }
        await editVendor(
          { id: initialData.id, data: values },
          {
            onSuccess: () => {
              toast.success("Vendor updated successfully!");
              form.reset();
              router.push("/vendors");
              router.refresh();
            },
            onError: (error) => {
              console.error("Edit vendor error:", error);
              toast.error("Failed to update vendor");
            },
          }
        );
        onCancel?.();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Name"
          placeholder="Enter vendor name"
        />
        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email"
            placeholder="johndoe@gmail.com"
          />

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone number"
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="address.addressName"
            label="Address Name"
            placeholder="Enter address name"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="address.address"
            label="Physical Address"
            placeholder="Enter physical address"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="address.country"
            label="Country"
            placeholder="Select a country"
            onValueChange={handleCountryChange}
            key={`country-${form.watch("address.country") || ""}`}
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
            name="address.state"
            label="State"
            placeholder={
              selectedCountry ? "Select a state" : "Select a country first"
            }
            onValueChange={handleStateChange}
            disabled={!selectedCountry}
            key={`state-${form.watch("address.state") || ""}`}
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
            name="address.city"
            label="City"
            placeholder={
              selectedState ? "Select a city" : "Select a state first"
            }
            onValueChange={(value) => {
              form.setValue("address.city", value);
              form.trigger("address.city");
            }}
            disabled={!selectedState}
            key={`city-${form.watch("address.city") || ""}`}
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
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            onClick={() => {
              form.reset();
              onCancel?.();
            }}
            className="shad-danger-btn"
          >
            Cancel
          </Button>
          <SubmitButton
            isLoading={isAddingVendor || isEditingVendor}
            className="shad-primary-btn"
          >
            {mode === "create" ? "Create Vendor" : "Update Vendor"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default VendorForm;
