import {
  addCompanySettings,
  getCompanySettings,
  updateCompanySettings,
} from "@/lib/actions/company.actions";
import { storage } from "@/lib/appwrite-client";
import { CompanySettingsFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID } from "appwrite";
import toast from "react-hot-toast";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

export const useCompanySettings = () => {
  const queryClient = useQueryClient();

  // get company settings
  const {
    data: companySettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const result = await getCompanySettings();

      if (!result) {
        throw new Error("Failed to fetch company settings");
      }
      return result;
    },
  });

  // add company settings
  const {
    mutate: addCompanySettingsMutation,
    status: isAddingCompanySettings,
  } = useMutation({
    mutationFn: async (data: CompanySettingsFormValues) => {
      let logoId = "";
      let logoUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          logoId = ID.unique();

          // Upload the file
          const upload = await storage.createFile(BUCKET_ID!, logoId, file);

          // Get the file view URL
          if (upload) {
            logoUrl = storage.getFileView(BUCKET_ID!, logoId).toString();
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error("Failed to upload profile image");
        }
      }

      // Prepare user data with file information
      const companySettings = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        currency: data.currency,
        currencySymbol: data.currencySymbol,
        logoId,
        logoUrl,
      };

      return addCompanySettings(companySettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      toast.success("Company settings created successfully");
    },
    onError: (error) => {
      console.error("Error creating company settings:", error);
      toast.error(error.message);
    },
  });

  // update company settings
  const {
    mutate: updateCompanySettingsMutation,
    status: isUpdatingCompanySettings,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
      prevLogoId,
    }: {
      id: string;
      data: CompanySettingsFormValues;
      prevLogoId: string;
    }) => {
      let logoId = "";
      let logoUrl = "";

      if (prevLogoId && data.image && data.image.length > 0) {
        try {
          await storage.deleteFile(BUCKET_ID!, prevLogoId);
        } catch (error) {
          console.warn("Error deleting previous logo:", error);
        }
      }

      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        logoId = ID.unique();

        // Upload the file
        const upload = await storage.createFile(BUCKET_ID!, logoId, file);

        // Get the file view URL
        if (upload) {
          logoUrl = storage.getFileView(BUCKET_ID!, logoId).toString();
        }
      }

      const companySettings = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        currency: data.currency,
        currencySymbol: data.currencySymbol,
        logoId,
        logoUrl,
      };

      return updateCompanySettings(id, companySettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      toast.success("Company settings updated successfully");
    },
    onError: (error) => {
      console.error("Error updating company settings:", error);
      toast.error(error.message);
    },
  });

  return {
    companySettings,
    isLoading,
    error,
    addCompanySettings: addCompanySettingsMutation,
    isAddingCompanySettings: isAddingCompanySettings === "pending",
    updateCompanySettings: updateCompanySettingsMutation,
    isUpdatingCompanySettings: isUpdatingCompanySettings === "pending",
  };
};
