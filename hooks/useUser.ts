import { getUserById } from "@/lib/actions/user.actions";
import { useQuery } from "@tanstack/react-query";

export const useUser = (userId: string) => {
  const {
    data: singleUser,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });

  return { singleUser, isLoading, error };
};
