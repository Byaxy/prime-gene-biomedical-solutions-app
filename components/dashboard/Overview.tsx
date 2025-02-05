import { useSales } from "@/hooks/useSales";
import OverviewCard from "./OverviewCard";
import { Expenses, Purchase, Sale } from "@/types/appwrite.types";
import { usePurchases } from "@/hooks/usePurchases";
import { useExpenses } from "@/hooks/useExpenses";
import ProductsOverview from "./ProductsOverview";

const Overview = () => {
  const { sales, isLoading } = useSales();
  const { purchases, isLoading: purchasesLoading } = usePurchases();
  const { expenses, isLoading: expensesLoading } = useExpenses();

  const salesTotalPaid = sales
    ? sales.reduce((sum: number, sale: Sale) => (sum += sale.amountPaid), 0)
    : 0;

  const salesTotalAmount = sales
    ? sales.reduce((sum: number, sale: Sale) => (sum += sale.totalAmount), 0)
    : 0;

  const purchasesTotalPaid = purchases
    ? purchases.reduce(
        (sum: number, purchase: Purchase) => (sum += purchase.amountPaid),
        0
      )
    : 0;

  const purchasesTotalAmount = purchases
    ? purchases.reduce(
        (sum: number, purchase: Purchase) => (sum += purchase.totalAmount),
        0
      )
    : 0;

  const totalExpenses = expenses
    ? expenses.reduce(
        (sum: number, expense: Expenses) => (sum += expense.amount),
        0
      )
    : 0;

  return (
    <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Total Sales"
        data={[
          {
            name: "Pending",
            value: salesTotalAmount - salesTotalPaid,
            color: "#EDF3F6",
          },
          {
            name: "Paid",
            value: salesTotalPaid,
            color: "#002060",
          },
        ]}
        total={salesTotalAmount}
        isLoading={isLoading}
      />
      <OverviewCard
        title="Purchases"
        data={[
          {
            name: "Pending",
            value: purchasesTotalAmount - purchasesTotalPaid,
            color: "#EDF3F6",
          },
          {
            name: "Paid",
            value: purchasesTotalPaid,
            color: "#72d9d6",
          },
        ]}
        total={purchasesTotalAmount}
        isLoading={purchasesLoading}
      />

      <ProductsOverview />

      <OverviewCard
        title="Expenses"
        data={[
          {
            name: "Total Expenses",
            value: totalExpenses,
            color: "#72d9d6",
          },
        ]}
        total={totalExpenses}
        isLoading={expensesLoading}
      />
    </div>
  );
};

export default Overview;
