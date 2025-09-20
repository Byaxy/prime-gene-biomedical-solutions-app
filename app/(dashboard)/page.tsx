import Overview from "@/components/dashboard/Overview";
import DashboardSalesChart from "@/components/dashboard/DashboardSalesChart";
import DashboardSalesTable from "@/components/dashboard/DashboardSalesTable";
import DashboardPurchasesTable from "@/components/dashboard/DashboardPurchasesTable";

export default async function Home(props: {
  searchParams: Promise<{
    salesRange?: string;
    salesRangeFrom: string;
    salesRangeTo: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Overview />

      <div className="grid grid-cols-1 w-full">
        <DashboardSalesChart searchParams={searchParams} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        <DashboardSalesTable />

        <DashboardPurchasesTable />
      </div>
    </div>
  );
}
