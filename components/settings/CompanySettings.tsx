"use client";

import { useCompanySettings } from "@/hooks/useCompanySettings";
import CompanySettingsForm from "../forms/CompanySettingsForm";
import { CompanySettingsFormValues } from "@/lib/validation";
import Loading from "@/components/loading";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";

const CompanySettings = () => {
  const { user } = useAuth();
  const { singleUser, isLoading } = useUser(user?.$id ?? "");
  const { companySettings, addCompanySettings, updateCompanySettings } =
    useCompanySettings();

  if (isLoading) {
    return <Loading />;
  }

  const handleSubmit = async (
    data: CompanySettingsFormValues,
    prevLogoId?: string
  ) => {
    try {
      if (companySettings.length === 0) {
        await addCompanySettings(data);
      } else if (companySettings.length > 0) {
        await updateCompanySettings({
          id: companySettings[0].$id,
          data: data,
          prevLogoId: data?.image && data.image.length > 0 ? prevLogoId! : "",
        });
      }
    } catch (error) {
      console.error("Error saving company settings:", error);
    }
  };

  return (
    <div className="w-full">
      <CompanySettingsForm
        initialData={
          companySettings && companySettings.length > 0
            ? {
                $id: companySettings[0].$id,
                name: companySettings[0].name,
                email: companySettings[0].email,
                phone: companySettings[0].phone,
                address: companySettings[0].address,
                city: companySettings[0].city,
                state: companySettings[0].state,
                country: companySettings[0].country,
                currency: companySettings[0].currency,
                currencySymbol: companySettings[0].currencySymbol,
                logoId: companySettings[0].logoId,
                logoUrl: companySettings[0].logoUrl,
                $createdAt: companySettings[0].$createdAt,
                $updatedAt: companySettings[0].$updatedAt,
              }
            : null
        }
        onSubmit={handleSubmit}
        isAdmin={singleUser?.role === "admin"}
      />
    </div>
  );
};

export default CompanySettings;
