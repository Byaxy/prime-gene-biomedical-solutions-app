"use client";

import { getCustomerById } from "@/lib/actions/customer.actions";
import { useQuery } from "@tanstack/react-query";
import CustomerForm from "../forms/CustomerForm";
import { Alert, AlertDescription } from "../ui/alert";
import Loading from "@/app/(dashboard)/loading";

interface Props {
  customerId: string;
}

const EditCustomerPage = ({ customerId }: Props) => {
  const {
    data: customer,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomerById(customerId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load customer data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <section className="space-y-6">
      <CustomerForm mode={"edit"} initialData={customer} />
    </section>
  );
};

export default EditCustomerPage;
