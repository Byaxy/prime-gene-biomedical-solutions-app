"use client";

import { useMemo, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Country, State, City } from "country-state-city";
import { IState, ICity } from "country-state-city";
import {
  AccountType,
  AccountWithRelations,
  ChartOfAccountType,
  ChartOfAccountWithRelations,
} from "@/types";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useAccounts } from "@/hooks/useAccounts";
import {
  AccountFormValidationRefined,
  AccountFormValues,
} from "@/lib/validation";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/hooks/useAuth";

interface AccountFormProps {
  mode: "create" | "edit";
  initialData?: AccountWithRelations;
  chartOfAccounts: ChartOfAccountWithRelations[];
}

export const AccountForm = ({
  mode,
  initialData,
  chartOfAccounts,
}: AccountFormProps) => {
  const router = useRouter();
  const { user } = useAuth();

  const { companySettings } = useCompanySettings();

  const { addAccount, isAddingAccount, updateAccount, isUpdatingAccount } =
    useAccounts();

  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);

  // Memoized default values for new/edit accounts
  const defaultValues = useMemo(
    () => ({
      name: initialData?.account?.name || "",
      accountType:
        (initialData?.account?.accountType as AccountType) ||
        AccountType.CASH_ON_HAND,
      accountNumber: initialData?.account?.accountNumber || "",
      bankName: initialData?.account?.bankName || "",
      bankAddress: {
        addressName: initialData?.account?.bankAddress?.addressName || "",
        address: initialData?.account?.bankAddress?.address || "",
        city: initialData?.account?.bankAddress?.city || "",
        state: initialData?.account?.bankAddress?.state || "",
        country: initialData?.account?.bankAddress?.country || "",
      },
      swiftCode: initialData?.account?.swiftCode || "",
      merchantCode: initialData?.account?.merchantCode || "",
      openingBalance: initialData?.account?.openingBalance || 0,
      currentBalance: initialData?.account?.currentBalance || 0,
      currency:
        initialData?.account?.currency || companySettings?.currency || "",
      chartOfAccountsId: initialData?.account?.chartOfAccountsId || "",
    }),
    [initialData, companySettings]
  );

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(AccountFormValidationRefined),
    mode: "all",
    defaultValues: defaultValues,
  });

  const selectedAccountType = form.watch("accountType");
  const selectedCountry = form.watch("bankAddress.country");
  const selectedState = form.watch("bankAddress.state");

  const isAnyMutationLoading = isAddingAccount || isUpdatingAccount;

  const flattenedChartOfAccounts = useMemo(() => {
    const flatten = (
      nodes: ChartOfAccountWithRelations[],
      depth = 0,
      prefix = ""
    ): (ChartOfAccountWithRelations & {
      depth: number;
      displayPrefix: string;
    })[] => {
      let result: (ChartOfAccountWithRelations & {
        depth: number;
        displayPrefix: string;
      })[] = [];
      nodes.forEach((node) => {
        const currentPrefix = prefix
          ? `${prefix} / ${node.account.accountName}`
          : node.account.accountName;
        result.push({ ...node, depth, displayPrefix: currentPrefix });
        if (node.children && node.children.length > 0) {
          result = result.concat(
            flatten(node.children, depth + 1, currentPrefix)
          );
        }
      });
      return result;
    };
    return flatten(chartOfAccounts).filter(
      (item: ChartOfAccountWithRelations) =>
        item.account.isActive &&
        item.account.accountType === ChartOfAccountType.ASSET
    );
  }, [chartOfAccounts]);

  // Effects for country/state/city changes for bank address
  useEffect(() => {
    if (selectedCountry) {
      setStates(State.getStatesOfCountry(selectedCountry) || []);
      form.setValue("bankAddress.state", "");
      form.setValue("bankAddress.city", "");
      setCities([]);
    } else {
      setStates([]);
      setCities([]);
    }
  }, [selectedCountry, form]);

  useEffect(() => {
    if (selectedState && selectedCountry) {
      setCities(City.getCitiesOfState(selectedCountry, selectedState) || []);
      form.setValue("bankAddress.city", "");
    } else {
      setCities([]);
    }
  }, [selectedState, selectedCountry, form]);

  // Handle country change for bank address
  const handleCountryChange = (value: string) => {
    form.setValue("bankAddress.country", value);
    form.trigger("bankAddress.country");
  };

  // Handle state change for bank address
  const handleStateChange = (value: string) => {
    if (!selectedCountry) return;
    form.setValue("bankAddress.state", value);
    form.trigger("bankAddress.state");
  };

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: AccountFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Creating Financial Account..."
        : "Updating Financial Account..."
    );

    if (!user) {
      toast.error("User not found.");
      return;
    }

    try {
      if (mode === "create") {
        await addAccount(
          { data: values, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Financial Account created successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/banking");
              router.refresh();
              form.reset(defaultValues);
            },
            onError: () => {
              toast.error("Failed to create Financial Account.", {
                id: loadingToastId,
              });
            },
          }
        );
      } else if (mode === "edit" && initialData?.account?.id) {
        await updateAccount(
          { id: initialData.account.id, data: values },
          {
            onSuccess: () => {
              toast.success("Financial Account updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/banking");
            },
            onError: () => {
              toast.error("Failed to update Financial Account.", {
                id: loadingToastId,
              });
            },
          }
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred during submission.", {
        id: loadingToastId,
      });
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="accountType"
            label="Account Type"
            placeholder="Select account type"
            disabled={isAnyMutationLoading}
          >
            {Object.values(AccountType).map((type) => (
              <SelectItem
                key={type}
                value={type}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
              >
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Account Name"
            placeholder="e.g., Ecobank Current, Petty Cash, MTN Momo"
            disabled={isAnyMutationLoading}
          />
        </div>

        {/* Conditional fields based on Account Type */}
        {(selectedAccountType === AccountType.BANK ||
          selectedAccountType === AccountType.MOBILE_MONEY) && (
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="accountNumber"
            label="Account Number"
            placeholder={
              selectedAccountType === AccountType.BANK
                ? "Enter bank account number"
                : "Enter mobile money account number"
            }
            disabled={isAnyMutationLoading}
          />
        )}

        {selectedAccountType === AccountType.BANK && (
          <>
            <div className="w-full flex flex-col md:flex-row gap-5">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="bankName"
                label="Bank Name"
                placeholder="e.g., Ecobank Liberia Limited"
                disabled={isAnyMutationLoading}
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="swiftCode"
                label="SWIFT Code (Optional)"
                placeholder="e.g., ECOCLRLMXXX"
                disabled={isAnyMutationLoading}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 pt-2">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="bankAddress.addressName"
                label="Address Name (Optional)"
                placeholder="e.g., Head Office"
                disabled={isAnyMutationLoading}
              />
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="bankAddress.country"
                label="Country (Optional)"
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
                name="bankAddress.state"
                label="State (Optional)"
                placeholder={
                  selectedCountry ? "Select a state" : "Select a country first"
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
                name="bankAddress.city"
                label="City (Optional)"
                placeholder={
                  selectedState ? "Select a city" : "Select a state first"
                }
                onValueChange={(value) => {
                  form.setValue("bankAddress.city", value);
                  form.trigger("bankAddress.city");
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
                name="bankAddress.address"
                label="Address (Optional)"
                placeholder="Enter physical address"
                disabled={isAnyMutationLoading}
              />
            </div>
          </>
        )}

        {selectedAccountType === AccountType.MOBILE_MONEY && (
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="merchantCode"
            label="Merchant Code (Optional)"
            placeholder="e.g., 767587"
            disabled={isAnyMutationLoading}
          />
        )}

        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="openingBalance"
            label="Opening Balance"
            placeholder="0.00"
            disabled={mode === "edit" || isAnyMutationLoading}
          />
          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="currentBalance"
            label="Current Balance"
            placeholder="0.00"
            disabled={true}
          />
        </div>

        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="currency"
            label="Currency"
            placeholder="Select currency"
            disabled={isAnyMutationLoading}
          >
            {/* You'd typically fetch supported currencies from a constant or database */}
            <SelectItem
              value={companySettings?.currency ?? "USD"}
              className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
            >
              {companySettings?.currency ?? "USD - US Dollar"}
            </SelectItem>
            {/* Add more currencies as needed */}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="chartOfAccountsId"
            label="Link to Chart of Account (Asset Type)"
            placeholder="Select an Asset account"
            disabled={isAnyMutationLoading}
          >
            {flattenedChartOfAccounts.map((coaItem) => (
              <SelectItem
                key={coaItem.account.id}
                value={coaItem.account.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                style={{ paddingLeft: `${coaItem.depth * 20}px` }}
              >
                {coaItem.account.accountName}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

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
            isLoading={isAnyMutationLoading}
            className="shad-primary-btn"
            disabled={isAnyMutationLoading}
          >
            {mode === "create" ? "Create Account" : "Update Account"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
