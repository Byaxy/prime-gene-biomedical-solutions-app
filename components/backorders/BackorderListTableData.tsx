import {
  BackorderFilters,
  getBackorders,
} from "@/lib/actions/backorder.actions";
import BackorderListTable from "./BackorderListTable";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getProducts } from "@/lib/actions/product.actions";
import { getSales } from "@/lib/actions/sale.actions";

interface Props {
  currentPage: number;
  currentPageSize: number;
  filters: BackorderFilters;
}

const BackorderListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: Props) => {
  const [initialData, customers, products, sales] = await Promise.all([
    getBackorders(currentPage, currentPageSize, currentPageSize === 0, filters),
    getCustomers(0, 0, true),
    getProducts(0, 0, true, { isActive: "true" }),
    getSales(0, 0, true),
  ]);

  return (
    <BackorderListTable
      initialData={initialData}
      allCustomers={customers.documents}
      allProducts={products.documents}
      allSales={sales.documents}
    />
  );
};

export default BackorderListTableData;
