"use client";

import { useSales } from "@/hooks/useSales";
import OverviewCard from "./OverviewCard";
import { usePurchases } from "@/hooks/usePurchases";
import { useExpenses } from "@/hooks/useExpenses";
import {
  ExpenseWithRelations,
  ProductWithRelations,
  PurchaseWithRelations,
  SaleWithRelations,
} from "@/types";
import { useProducts } from "@/hooks/useProducts";

const Overview = () => {
  const { sales, isLoading } = useSales({ getAllSales: true });
  const { purchases, isLoading: purchasesLoading } = usePurchases({
    getAllPurchases: true,
  });
  const { expenses, isLoading: expensesLoading } = useExpenses({
    getAllExpenses: true,
  });

  const { products, isLoading: productsLoading } = useProducts({
    getAllProducts: true,
  });

  const totalProducts = products ? products.length : 0;
  const totalActiveProducts = products
    ? products.reduce(
        (sum: number, p: ProductWithRelations) =>
          sum + (p.product.isActive ? 1 : 0),
        0
      )
    : 0;

  const salesTotalPaid = sales
    ? sales.reduce(
        (sum: number, sale: SaleWithRelations) => (sum += sale.sale.amountPaid),
        0
      )
    : 0;

  const salesTotalAmount = sales
    ? sales.reduce(
        (sum: number, sale: SaleWithRelations) =>
          (sum += sale.sale.status === "cancelled" ? 0 : sale.sale.totalAmount),
        0
      )
    : 0;
  const salesTotalAmountCancelled = sales
    ? sales.reduce(
        (sum: number, sale: SaleWithRelations) =>
          (sum += sale.sale.status === "cancelled" ? sale.sale.totalAmount : 0),
        0
      )
    : 0;

  const purchasesTotalAmount = purchases
    ? purchases.reduce(
        (sum: number, purchase: PurchaseWithRelations) =>
          (sum +=
            purchase.purchase.status === "cancelled"
              ? 0
              : purchase.purchase.totalAmount),
        0
      )
    : 0;

  const totalExpenses = expenses
    ? expenses.reduce(
        (sum: number, expense: ExpenseWithRelations) =>
          (sum += expense.expense.amount),
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
            color: "#72d9d6",
          },
          {
            name: "Paid",
            value: salesTotalPaid,
            color: "#002060",
          },
          {
            name: "Cancelled",
            value: salesTotalAmountCancelled,
            color: "#dc2626",
          },
        ]}
        total={salesTotalAmount}
        isLoading={isLoading}
      />
      <OverviewCard
        title="Purchases"
        data={[
          {
            name: "Total Amount",
            value: purchasesTotalAmount,
            color: "#002060",
          },
        ]}
        total={purchasesTotalAmount}
        isLoading={purchasesLoading}
      />

      <OverviewCard
        title="Number of Products"
        data={[
          {
            name: "Active",
            value: totalActiveProducts,
            color: "#002060",
          },
          {
            name: "Inactive",
            value: totalProducts - totalActiveProducts,
            color: "#dc2626",
          },
        ]}
        total={totalProducts}
        isLoading={productsLoading}
        isNumber
      />

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
