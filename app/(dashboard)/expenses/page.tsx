import ExpensesTable from "@/components/expenses/ExpensesTable";
import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import Loading from "../loading";

const Expenses = () => {
  return (
    <PageWraper
      title="Expenses"
      buttonText="Add Expense"
      buttonPath="/expenses/add-expense"
    >
      <Suspense fallback={<Loading />}>
        <ExpensesTable />
      </Suspense>
    </PageWraper>
  );
};

export default Expenses;
