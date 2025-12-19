import { JSX } from "react";
import { generateId } from "@/lib/utils";
import {
  Calculator,
  LayoutGrid,
  Receipt,
  Settings,
  Store,
  UsersRound,
} from "lucide-react";
import { Bell } from "lucide-react";
import { ChartColumn } from "lucide-react";
import { CircleDollarSign } from "lucide-react";
import { ShoppingBasket } from "lucide-react";
import { FileTerminal } from "lucide-react";

export type SidebarDataType = {
  id: string;
  title: string;
  path: string;
  icon?: JSX.Element;
  subCategories?: SidebarDataType[];
};

export const sidebarData: SidebarDataType[] = [
  {
    id: generateId(),
    title: "Dashboard",
    path: "/",
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Products Management",
    path: "",
    icon: <Store className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Inventory",
        path: "",
        icon: <ShoppingBasket className="h-5 w-5" />,
        subCategories: [
          {
            id: generateId(),
            title: "Inventory List",
            path: "/inventory",
          },
          {
            id: generateId(),
            title: "Add Inventory",
            path: "/inventory/add-inventory",
          },
          {
            id: generateId(),
            title: "Adjust Inventory",
            path: "/inventory/adjust-inventory",
          },
          {
            id: generateId(),
            title: "Inventory Adjustment List",
            path: "/inventory/inventory-adjustment-list",
          },
          {
            id: generateId(),
            title: "Inventory Stocks",
            path: "/inventory/inventory-stocks",
          },

          {
            id: generateId(),
            title: "Back Orders",
            path: "/backorders",
          },
        ],
      },
      {
        id: generateId(),
        title: "Services",
        path: "",
        icon: <FileTerminal className="h-5 w-5" />,
        subCategories: [
          {
            id: generateId(),
            title: "Services List",
            path: "/services",
          },
          {
            id: generateId(),
            title: "Add Services",
            path: "/services/add-services",
          },
        ],
      },
    ],
  },
  {
    id: generateId(),
    title: "Sales Management",
    path: "",
    icon: <Calculator className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Quotations",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Create Quotation",
            path: "/quotations/create-quotation",
          },
          {
            id: generateId(),
            title: "Quotation List",
            path: "/quotations",
          },
        ],
      },
      {
        id: generateId(),
        title: "Create Invoice",
        path: "/sales/create-invoice",
      },
      {
        id: generateId(),
        title: "Sales List",
        path: "/sales",
      },
      {
        id: generateId(),
        title: "Deliveries",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Create Delivery Note",
            path: "/deliveries/create-delivery",
          },
          {
            id: generateId(),
            title: "Delivery List",
            path: "/deliveries",
          },
        ],
      },
      {
        id: generateId(),
        title: "Promissory Note",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Create Promissory Note",
            path: "/promissory-notes/create-promissory-note",
          },
          {
            id: generateId(),
            title: "Promissory Note List",
            path: "/promissory-notes",
          },
        ],
      },
      {
        id: generateId(),
        title: "Way-Bill",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Create Way-Bill",
            path: "/waybills/create-waybill",
          },
          {
            id: generateId(),
            title: "Waybill List",
            path: "/waybills",
          },
        ],
      },
    ],
  },

  {
    id: generateId(),
    title: "Purchases Management",
    path: "",
    icon: <Receipt className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Create Purchase Order",
        path: "/purchases/create-purchase-order",
      },
      {
        id: generateId(),
        title: "Purchase Order List",
        path: "/purchases/purchase-orders",
      },
      {
        id: generateId(),
        title: "Create Purchase",
        path: "/purchases/create-purchase",
      },
      {
        id: generateId(),
        title: "Purchased List",
        path: "/purchases",
      },
      {
        id: generateId(),
        title: "Manage Shipping",
        path: "/purchases/manage-shipping",
      },
      {
        id: generateId(),
        title: "Shipping List",
        path: "/purchases/shipments",
      },
      {
        title: "Receive Purchased Inventory",
        path: "/purchases/receive-purchased-inventory",
        id: generateId(),
      },
      {
        id: generateId(),
        title: "Received Inventory List",
        path: "/purchases/received-inventory",
      },
    ],
  },

  {
    id: generateId(),
    title: "People",
    path: "",
    icon: <UsersRound className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Customers",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Customer List",
            path: "/customers",
          },
          {
            id: generateId(),
            title: "Add Customer",
            path: "/customers/add-customer",
          },
        ],
      },
      {
        id: generateId(),
        title: "Vendors",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Vendors List",
            path: "/vendors",
          },
          {
            id: generateId(),
            title: "Add Vendor",
            path: "/vendors/add-vendor",
          },
          {
            id: generateId(),
            title: "Transactions",
            path: "/vendors/transactions",
          },
          {
            id: generateId(),
            title: "Pay Bills",
            path: "/vendors/pay-bills",
          },
        ],
      },
      {
        id: generateId(),
        title: "Users",
        path: "",

        subCategories: [
          {
            id: generateId(),
            title: "Users List",
            path: "/users",
          },
          {
            id: generateId(),
            title: "Add User",
            path: "/users/add-user",
          },
        ],
      },
      {
        id: generateId(),
        title: "Sales Agents",
        path: "",

        subCategories: [
          {
            id: generateId(),
            title: "Sales Agents List",
            path: "/sales-agents",
          },
          {
            id: generateId(),
            title: "Add Sales Agent",
            path: "/sales-agents/create",
          },
        ],
      },
    ],
  },
  {
    id: generateId(),
    title: "Accounting and Finance",
    path: "",
    icon: <CircleDollarSign className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Chart of Accounts",
        path: "/accounting-and-finance/chart-of-accounts",
      },
      {
        id: generateId(),
        title: "Banking",
        path: "/accounting-and-finance/banking",
      },
      {
        id: generateId(),
        title: "Income Management",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Income Register",
            path: "/accounting-and-finance/income/register",
          },
          {
            id: generateId(),
            title: "Income Tracker",
            path: "/accounting-and-finance/income",
          },
          {
            id: generateId(),
            title: "Receipts",
            path: "/accounting-and-finance/income/receipts",
          },
        ],
      },

      {
        id: generateId(),
        title: "Expense Management",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Bills Management",
            path: "/accounting-and-finance/billing",
          },
          {
            id: generateId(),
            title: "Expense Tracker",
            path: "/accounting-and-finance/expenses",
          },
          {
            id: generateId(),
            title: "Sales Commissions",
            path: "/accounting-and-finance/commissions",
          },
          {
            id: generateId(),
            title: "Commission Payments",
            path: "/accounting-and-finance/commissions/payments",
          },
        ],
      },
    ],
  },
  {
    id: generateId(),
    title: "Human Resource Management",
    path: "",
    icon: <UsersRound className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Employee List",
        path: "/human-resource-management/employees",
      },
      {
        id: generateId(),
        title: "Add Employee",
        path: "/human-resource-management/employees/add-employee",
      },
      {
        id: generateId(),
        title: "Payroll Management",
        path: "/human-resource-management/payroll",
      },
      {
        id: generateId(),
        title: "Time Tracking",
        path: "/human-resource-management/time-tracking",
      },
    ],
  },
  {
    id: generateId(),
    title: "Notifications",
    path: "/notifications",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Reporting and Analysis",
    path: "",
    icon: <ChartColumn className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Standard Reports",
        path: "/reporting-and-analysis/standard-reports",
      },
      {
        id: generateId(),
        title: "Custom Reports",
        path: "/reporting-and-analysis/custom-reports",
      },
      {
        id: generateId(),
        title: "Sales Reports",
        path: "/reporting-and-analysis/sales-reports",
      },
      {
        id: generateId(),
        title: "Expenses Reports",
        path: "/reporting-and-analysis/expenses-reports",
      },
    ],
  },
  {
    id: generateId(),
    title: "Settings",
    path: "",
    icon: <Settings className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "System Settings",
        path: "/settings",
      },
      {
        id: generateId(),
        title: "My Profile",
        path: "/settings/profile",
      },
      {
        id: generateId(),
        title: "Categories",
        path: "/settings/categories",
      },
      {
        id: generateId(),
        title: "Brands",
        path: "/settings/brands",
      },
      {
        id: generateId(),
        title: "Types",
        path: "/settings/types",
      },
      {
        id: generateId(),
        title: "Units",
        path: "/settings/units",
      },
      {
        id: generateId(),
        title: "Taxes",
        path: "/settings/taxes",
      },
      {
        id: generateId(),
        title: "Stores",
        path: "/settings/stores",
      },
      {
        id: generateId(),
        title: "Expense Categories",
        path: "/settings/expense-categories",
      },
      {
        id: generateId(),
        title: "Income Categories",
        path: "/settings/income-categories",
      },
      {
        id: generateId(),
        title: "Accompanying Expense Types",
        path: "/settings/accompanying-expense-types",
      },
    ],
  },
];

export const RoleOptions = ["user", "admin"];
