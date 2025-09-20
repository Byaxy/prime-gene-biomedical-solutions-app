import Link from "next/link";
import { Button } from "../ui/button";
import { dashboardSalesColumns } from "../table/columns/dashboardSalesColumns";
import { ItemsTable } from "../table/ItemsTable";
import { getSales } from "@/lib/actions/sale.actions";

const DashboardSalesTable = async () => {
  const salesData = await getSales(0, 5, false);

  const sales = salesData.documents;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-5 space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
        <h2 className="text-xl font-semibold">Recent Sales</h2>
        <Button
          variant="outline"
          className="text-blue-800 font-medium bg-transparent"
          asChild
        >
          <Link href="/sales" prefetch={true}>
            View All
          </Link>
        </Button>
      </div>
      <ItemsTable columns={dashboardSalesColumns} data={sales || []} />
    </div>
  );
};

export default DashboardSalesTable;
