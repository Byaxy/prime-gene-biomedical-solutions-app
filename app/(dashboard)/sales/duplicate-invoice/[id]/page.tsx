"use client";

import SaleForm from "@/components/forms/SaleForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getSaleById } from "@/lib/actions/sale.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import React from "react";

const DuplicateInvoice = () => {
  const { id } = useParams();

  const { data: sale, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getSaleById(id as string);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <Loading />;
  }
  return (
    <PageWraper title="Duplicate Invoice">
      <section className="space-y-6">
        <SaleForm mode={"create"} initialData={sale ? sale : undefined} />
      </section>
    </PageWraper>
  );
};

export default DuplicateInvoice;
