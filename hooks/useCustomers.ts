import { getCustomers } from "@/lib/actions/customer.actions";
import { useQuery } from "@tanstack/react-query";

export const useCustomers = () => {
  // Get all customers
  const {
    data: customers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const result = await getCustomers();

      if (!result) {
        throw new Error("Failed to fetch customers");
      }
      return result;
    },
  });

  return {
    customers,
    isLoading,
    error,
  };
};
