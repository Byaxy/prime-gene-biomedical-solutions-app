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
    title: "Inventory Management",
    path: "",
    icon: <Store className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Products",
        path: "",
        icon: <ShoppingBasket className="h-5 w-5" />,
        subCategories: [
          {
            id: generateId(),
            title: "Inventory List",
            path: "",
          },
          {
            id: generateId(),
            title: "Add Inventory",
            path: "",
          },
          {
            id: generateId(),
            title: "Adjust Inventory",
            path: "",
          },
          {
            id: generateId(),
            title: "Inventory Adjustment List",
            path: "",
          },
          {
            id: generateId(),
            title: "Inventory Stocks",
            path: "",
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
            path: "/add-services",
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
            path: "",
          },
          {
            id: generateId(),
            title: "Quotation List",
            path: "",
          },
        ],
      },
      {
        id: generateId(),
        title: "Create Invoice",
        path: "",
      },
      {
        id: generateId(),
        title: "Sales List",
        path: "",
      },
      {
        id: generateId(),
        title: "Deliveries",
        path: "",
        subCategories: [
          {
            id: generateId(),
            title: "Create Delivery Note",
            path: "",
          },
          {
            id: generateId(),
            title: "Delivery List",
            path: "",
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
            path: "",
          },
          {
            id: generateId(),
            title: "Promissory Note List",
            path: "",
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
            path: "",
          },
          {
            id: generateId(),
            title: "Waybill List",
            path: "",
          },
        ],
      },
    ],
  },

  {
    id: generateId(),
    title: "Purchases Management",
    path: "/purchases",
    icon: <Receipt className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Create Purchase",
        path: "",
      },
      {
        id: generateId(),
        title: "Purchase Order List",
        path: "",
      },
      {
        id: generateId(),
        title: "Receive Inventory",
        path: "",
      },
      {
        id: generateId(),
        title: "Bills Payment",
        path: "",
      },
    ],
  },
  {
    id: generateId(),
    title: "Expenses",
    path: "/expenses",
    icon: <DollarSign className="h-5 w-5" />,
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
        path: "/customers",
        subCategories: [
          {
            id: generateId(),
            title: "Customer List",
            path: "",
          },
          {
            id: generateId(),
            title: "Add Customer",
            path: "",
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
            path: "",
          },
          {
            id: generateId(),
            title: "Add Vendor",
            path: "",
          },
          {
            id: generateId(),
            title: "Transactions",
            path: "",
          },
          {
            id: generateId(),
            title: "Pay Bills",
            path: "",
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
            path: "",
          },
          {
            id: generateId(),
            title: "Add User",
            path: "",
          },
        ],
      },
    ],
  },
  {
    id: generateId(),
    title: "Accounting and Finance",
    path: "/users",
    icon: <CircleDollarSign className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Chart of Account",
        path: "",
      },
      {
        id: generateId(),
        title: "Banking",
        path: "",
      },
      {
        id: generateId(),
        title: "Income Tracker",
        path: "",
      },
      {
        id: generateId(),
        title: "Bill Tracker",
        path: "",
      },
      {
        id: generateId(),
        title: "Expenses Tracker",
        path: "",
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
        path: "",
      },
      {
        id: generateId(),
        title: "Add Employee",
        path: "",
      },
      {
        id: generateId(),
        title: "Payroll Management",
        path: "",
      },
      {
        id: generateId(),
        title: "Time Tracking",
        path: "",
      },
    ],
  },
  {
    id: generateId(),
    title: "Notifications",
    path: "/quotations",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Reporting and Analysis",
    path: "/quotations",
    icon: <ChartColumn className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "Standard Reports",
        path: "",
      },
      {
        id: generateId(),
        title: "Custom Reports",
        path: "",
      },
      {
        id: generateId(),
        title: "Sales Reports",
        path: "",
      },
      {
        id: generateId(),
        title: "Expense Reports",
        path: "",
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
        title: "Categories",
        path: "/products/categories",
      },
      {
        id: generateId(),
        title: "Brands",
        path: "/products/brands",
      },
      {
        id: generateId(),
        title: "Types",
        path: "/products/types",
      },
      {
        id: generateId(),
        title: "Units",
        path: "/products/units",
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
