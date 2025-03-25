"use client";

import { useCompanySettings } from "@/hooks/useCompanySettings";
import CompanySettingsForm from "../forms/CompanySettingsForm";
import { CompanySettingsFormValues } from "@/lib/validation";
import Loading from "@/components/loading";
import { useAuth } from "@/hooks/useAuth";

const CompanySettings = () => {
  const { isAdmin } = useAuth();
  const {
    companySettings,
    addCompanySettings,
    updateCompanySettings,
    isLoading,
    isUpdatingCompanySettings,
    isAddingCompanySettings,
  } = useCompanySettings();

  const handleSubmit = async (
    data: CompanySettingsFormValues,
    prevLogoId?: string
  ) => {
    try {
      if (!companySettings) {
        await addCompanySettings(data);
      } else {
        await updateCompanySettings({
          id: companySettings.id,
          data: data,
          prevLogoId: data?.image && data.image.length > 0 ? prevLogoId! : "",
        });
      }
    } catch (error) {
      console.error("Error saving company settings:", error);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full">
      <CompanySettingsForm
        initialData={
          companySettings
            ? {
                ...companySettings,
                logoId: companySettings.logoId || "",
                logoUrl: companySettings.logoUrl || "",
              }
            : null
        }
        onSubmit={handleSubmit}
        isAdmin={isAdmin}
        isLoading={
          companySettings ? isUpdatingCompanySettings : isAddingCompanySettings
        }
      />
    </div>
  );
};

export default CompanySettings;
