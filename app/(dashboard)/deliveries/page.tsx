"use client";

import DeliveryDialog from "@/components/deliveries/DeliveryDialog";
import PageWraper from "@/components/PageWraper";
import { deliveriesColumns } from "@/components/table/columns/deliveriesColumns";
import { DataTable } from "@/components/table/DataTable";
import { useDeliveries } from "@/hooks/useDeliveries";
import { DeliveryStatus, DeliveryWithRelations } from "@/types";
import { useState } from "react";

const Deliveries = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(
    {} as DeliveryWithRelations
  );
  const {
    deliveries,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange,
    defaultFilterValues,
    refetch,
    isRefetching,
  } = useDeliveries({ initialPageSize: 10 });

  const handleRowClick = (rowData: DeliveryWithRelations) => {
    setSelectedDelivery(rowData);
    setOpenDialog(true);
  };

  const deliveriesFilters = {
    deliveryDate: {
      type: "date" as const,
      label: "Delivery Date",
    },
    status: {
      type: "select" as const,
      label: "Delivery Status",
      options: Object.values(DeliveryStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
  };

  return (
    <PageWraper
      title="Deliveries"
      buttonText="Add Delivery"
      buttonPath="/deliveries/create-delivery"
    >
      <>
        <DataTable
          columns={deliveriesColumns}
          data={deliveries || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={[
            "delivery.deliveryRefNumber",
            "customer.name",
            "sale.invoiceNumber",
          ]}
          onRowClick={handleRowClick}
          filters={deliveriesFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          refetch={refetch}
          isRefetching={isRefetching}
        />
        <DeliveryDialog
          mode={"view"}
          open={openDialog && !!selectedDelivery}
          onOpenChange={setOpenDialog}
          delivery={selectedDelivery}
        />
      </>
    </PageWraper>
  );
};

export default Deliveries;
