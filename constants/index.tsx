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
import { DollarSign } from "lucide-react";
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
        title: "Create Purchase",
        path: "/purchases/create-purchase",
      },
      {
        id: generateId(),
        title: "Purchase Order List",
        path: "/purchases",
      },
      {
        id: generateId(),
        title: "Receive Inventory",
        path: "/purchases/receive-inventory",
      },
      {
        id: generateId(),
        title: "Bills Payment",
        path: "/purchases/bills-payment",
      },
    ],
  },
  {
    id: generateId(),
    title: "Expenses",
    path: "",
    icon: <DollarSign className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Expenses List",
        path: "/expenses",
      },
      {
        id: generateId(),
        title: "Add Expense",
        path: "/expenses/add-expense",
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
        title: "Chart of Account",
        path: "/accounting-and-finance/chart-of-account",
      },
      {
        id: generateId(),
        title: "Banking",
        path: "/accounting-and-finance/banking",
      },
      {
        id: generateId(),
        title: "Income Tracker",
        path: "/accounting-and-finance/income-tracker",
      },
      {
        id: generateId(),
        title: "Bill Tracker",
        path: "/accounting-and-finance/bill-tracker",
      },
      {
        id: generateId(),
        title: "Expenses Tracker",
        path: "/accounting-and-finance/expenses-tracker",
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
    ],
  },
];

export const RoleOptions = ["user", "admin"];

export const purchaseStatus = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
export const saleStatus = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
export const quotationStatus = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
export const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "Mobile Money", value: "mobile-money" },
];

export const deliveryStatus = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];
