"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { CompanySettingsFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { companySettingsTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

interface CompanySettingsWithLogo
  extends Omit<CompanySettingsFormValues, "image"> {
  logoId: string;
  logoUrl: string;
}

// get company settings
export const getCompanySettings = async () => {
  try {
    const response = await db
      .select()
      .from(companySettingsTable)
      .then((res) => res[0]);

    return response;
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
    const insertedSettings = await db
      .insert(companySettingsTable)
      .values(companySettings)
      .returning();

    revalidatePath("/settings");
    return parseStringify(insertedSettings);
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

    const updatedDbCompanySettings = await db
      .update(companySettingsTable)
      .set(dbCompanySettings)
      .where(eq(companySettingsTable.id, id))
      .returning();

    revalidatePath("/settings");
    return parseStringify(updatedDbCompanySettings);
  } catch (error) {
    console.error("Error updating company settings:", error);
    throw error;
  }
};
