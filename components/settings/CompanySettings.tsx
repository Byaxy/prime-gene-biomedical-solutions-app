"use client";

import { useCompanySettings } from "@/hooks/useCompanySettings";
import CompanySettingsForm from "../forms/CompanySettingsForm";
import { CompanySettingsFormValues } from "@/lib/validation";
import { useEffect, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/context/AuthContext";
import { Users } from "@/types/appwrite.types";
import Loading from "@/app/(dashboard)/loading";

const CompanySettings = () => {
  const { user } = useAuth();
  const { getUserById, users } = useUsers();
  const { companySettings, addCompanySettings, updateCompanySettings } =
    useCompanySettings();

  const [userData, setUserData] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !users) return;

      const data = await getUserById(user.$id);
      setUserData(data);
      setLoading(false);
    };

    if (users) {
      fetchUserData();
    }
  }, [user, users, getUserById]);

  if (loading) {
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
        isAdmin={userData?.role === "admin"}
      />
    </div>
  );
};

export default CompanySettings;
