"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  databases,
  DATABASE_ID,
  COMPANY_SETTINGS_COLLECTION_ID,
} from "../appwrite-server";
import { CompanySettingsFormValues } from "../validation";

interface CompanySettingsWithLogo
  extends Omit<CompanySettingsFormValues, "image"> {
  logoId: string;
  logoUrl: string;
}

// get company settings
export const getCompanySettings = async () => {
  try {
    const companySettings = await databases.listDocuments(
      DATABASE_ID!,
      COMPANY_SETTINGS_COLLECTION_ID!,
      [Query.limit(1)]
    );

    return parseStringify(companySettings.documents);
  } catch (error) {
    console.error("Error getting company settings:", error);
    throw error;
  }
};

// create company settings
export const addCompanySettings = async (
  companySettings: CompanySettingsWithLogo
) => {
  try {
    const newCompanySettings = await databases.createDocument(
      DATABASE_ID!,
      COMPANY_SETTINGS_COLLECTION_ID!,
      ID.unique(),
      companySettings
    );

    revalidatePath("/settings");
    return parseStringify(newCompanySettings);
  } catch (error) {
    console.error("Error creating company settings:", error);
    throw error;
  }
};

// update company settings
export const updateCompanySettings = async (
  id: string,
  companySettings: CompanySettingsWithLogo
) => {
  try {
    let dbCompanySettings;
    if (companySettings.logoId && companySettings.logoUrl) {
      dbCompanySettings = {
        name: companySettings.name,
        email: companySettings.email,
        phone: companySettings.phone,
        address: companySettings.address,
        city: companySettings.city,
        state: companySettings.state,
        country: companySettings.country,
        currency: companySettings.currency,
        currencySymbol: companySettings.currencySymbol,
        logoId: companySettings.logoId,
        logoUrl: companySettings.logoUrl,
      };
    } else {
      dbCompanySettings = {
        name: companySettings.name,
        email: companySettings.email,
        phone: companySettings.phone,
        address: companySettings.address,
        city: companySettings.city,
        state: companySettings.state,
        country: companySettings.country,
        currency: companySettings.currency,
        currencySymbol: companySettings.currencySymbol,
      };
    }

    console.log("Updating company settings:", dbCompanySettings);

    const updatedDbCompanySettings = await databases.updateDocument(
      DATABASE_ID!,
      COMPANY_SETTINGS_COLLECTION_ID!,
      id,
      dbCompanySettings
    );

    revalidatePath("/settings");
    return parseStringify(updatedDbCompanySettings);
  } catch (error) {
    console.error("Error updating company settings:", error);
    throw error;
  }
};
