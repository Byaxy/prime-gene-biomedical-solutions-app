import { getSuppliers } from "@/lib/actions/supplier.actions";
import { useQuery } from "@tanstack/react-query";

export const useSuppliers = () => {
  // Get all suppliers
  const {
    data: suppliers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const result = await getSuppliers();

      if (!result) {
        throw new Error("Failed to fetch suppliers");
      }
      return result;
    },
  });

  return {
    suppliers,
    isLoading,
    error,
  };
};
