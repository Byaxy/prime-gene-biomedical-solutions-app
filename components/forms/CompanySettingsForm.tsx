/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  CompanySettingsFormValidation,
  CompanySettingsFormValues,
} from "@/lib/validation";
import { SelectItem } from "../ui/select";
import { FileUploader } from "../FileUploader";
import { CompanySettings } from "@/types/appwrite.types";
import { Country, State, City } from "country-state-city";
import { IState, ICity } from "country-state-city";

interface CompanySettingsFormProps {
  initialData?: CompanySettings | null;
  onSubmit: (
    data: CompanySettingsFormValues,
    prevLogoId?: string
  ) => Promise<void>;
  isAdmin?: boolean;
}

const CompanySettingsForm = ({
  initialData = null,
  onSubmit,
  isAdmin,
}: CompanySettingsFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [states, setStates] = useState<IState[]>(() =>
    initialData?.country ? State.getStatesOfCountry(initialData.country) : []
  );
  const [cities, setCities] = useState<ICity[]>(() =>
    initialData?.state
      ? City.getCitiesOfState(initialData.country, initialData.state)
      : []
  );

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(CompanySettingsFormValidation),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      currency: "",
      currencySymbol: "",
      image: [],
    },
  });

  const selectedCountry = form.watch("country");
  const selectedState = form.watch("state");

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      setStates(State.getStatesOfCountry(initialData.country) || []);
      setCities(
        City.getCitiesOfState(initialData.country, initialData.state) || []
      );
    }
  }, [initialData, form]);

  useEffect(() => {
    if (selectedCountry) {
      setStates(State.getStatesOfCountry(selectedCountry) || []);
      setCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState) {
      setCities(City.getCitiesOfState(selectedCountry, selectedState) || []);
    }
  }, [selectedState, selectedCountry]);

  // Handle country change
  const handleCountryChange = (value: string) => {
    const countryStates = State.getStatesOfCountry(value) || [];
    setStates(countryStates);
    setCities([]);

    form.setValue("country", value);
    form.setValue("state", "");
    form.setValue("city", "");
  };

  // Handle state change
  const handleStateChange = (value: string) => {
    if (!selectedCountry) return;

    const stateCities = City.getCitiesOfState(selectedCountry, value) || [];
    setCities(stateCities);

    form.setValue("state", value);
    form.setValue("city", "");
  };

  const handleSubmit = async (values: CompanySettingsFormValues) => {
    setIsLoading(true);
    try {
      if (initialData && values?.image) {
        await onSubmit(values, initialData.logoId);
      } else {
        await onSubmit(values);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <CustomFormField
          fieldType={FormFieldType.SKELETON}
          control={form.control}
          name="image"
          label="Company Logo"
          renderSkeleton={(field) => (
            <FormControl>
              <FileUploader
                files={field.value}
                onChange={field.onChange}
                mode={initialData ? "edit" : "create"}
                currentImageUrl={initialData?.logoUrl}
              />
            </FormControl>
          )}
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Company Name"
          placeholder="Enter your company name"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email"
            placeholder="Enter your company email"
          />

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone number"
          />

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="country"
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
            name="state"
            label="State"
            placeholder={
              selectedCountry ? "Select a state" : "Select a country first"
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
            name="city"
            label="City"
            placeholder={
              selectedState ? "Select a city" : "Select a state first"
            }
            onValueChange={(value) => form.setValue("city", value)}
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
            name="address"
            label="Address"
            placeholder="Enter your company address"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="currency"
            label="Currency"
            placeholder="Enter your company currency"
          />
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="currencySymbol"
            label="Currency Symbol"
            placeholder="Enter your company currency symbol"
          />
        </div>

        <div className="flex w-full pt-6">
          <SubmitButton isLoading={isLoading} disabled={!isAdmin}>
            {initialData ? "Update Settings" : "Save Settings"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default CompanySettingsForm;
