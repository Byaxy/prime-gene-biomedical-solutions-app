import Link from "next/link";
import { Button } from "../ui/button";
import { dashboardPurchasesColumns } from "../table/columns/dashboardPurchasesColumns";
import { getPurchases } from "@/lib/actions/purchase.actions";
import { ItemsTable } from "../table/ItemsTable";

const DashboardPurchasesTable = async () => {
  const purchasesData = await getPurchases(0, 5, false);

  const purchases = purchasesData.documents;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-5 space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
        <h2 className="text-xl font-semibold">Recent Purchases</h2>
        <Button
          variant="outline"
          className="text-blue-800 font-medium bg-transparent"
          asChild
        >
          <Link href="/purchases" prefetch={true}>
            View All
          </Link>
        </Button>
      </div>
      <ItemsTable columns={dashboardPurchasesColumns} data={purchases || []} />
    </div>
  );
};

export default DashboardPurchasesTable;
