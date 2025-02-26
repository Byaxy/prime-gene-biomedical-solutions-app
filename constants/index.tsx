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
    title: "Products",
    path: "",
    icon: <Store className="h-5 w-5" />,
    subCategories: [
      {
        id: generateId(),
        title: "All Products",
        path: "/products",
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
  {
    id: generateId(),
    title: "Quotations",
    path: "/quotations",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Sales",
    path: "/sales",
    icon: <Calculator className="h-5 w-5" />,
  },

  {
    id: generateId(),
    title: "Purchases",
    path: "/purchases",
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Expenses",
    path: "/expenses",
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Users",
    path: "/users",
    icon: <UsersRound className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Suppliers",
    path: "/suppliers",
    icon: <UsersRound className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Customers",
    path: "/customers",
    icon: <UsersRound className="h-5 w-5" />,
  },
  {
    id: generateId(),
    title: "Settings",
    path: "/settings",
    icon: <Settings className="h-5 w-5" />,
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
