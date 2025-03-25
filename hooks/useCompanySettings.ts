import {
  addCompanySettings,
  getCompanySettings,
  updateCompanySettings,
} from "@/lib/actions/company.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CompanySettingsFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

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
      return result || null;
    },
  });

  // add company settings
  const {
    mutate: addCompanySettingsMutation,
    status: isAddingCompanySettings,
  } = useMutation({
    mutationFn: async (data: CompanySettingsFormValues) => {
      const supabase = createSupabaseBrowserClient();
      let logoId = "";
      let logoUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          logoId = `${Date.now()}-${file.name}`; // Generate a unique file name

          // Upload the file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("images")
            .upload(logoId, file);

          if (uploadError) throw uploadError;

          // Get the file URL
          const { data: urlData } = supabase.storage
            .from("images")
            .getPublicUrl(logoId);

          logoUrl = urlData.publicUrl;
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
      const supabase = createSupabaseBrowserClient();
      let logoId = "";
      let logoUrl = "";

      // Delete the previous image if it exists and new image is provided
      if (prevLogoId && data?.image && data?.image.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("images")
          .remove([prevLogoId]);

        if (deleteError)
          console.warn("Failed to delete previous image:", deleteError);
      }

      // Upload the new image if provided
      if (data.image && data.image.length > 0) {
        const file = data.image[0];
        logoId = `${Date.now()}-${file.name}`; // Generate a unique file name

        // Upload the file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(logoId, file);

        if (uploadError) throw uploadError;

        // Get the file URL
        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(logoId);

        logoUrl = urlData.publicUrl;
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
