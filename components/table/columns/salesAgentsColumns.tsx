"use client";

import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { SalesAgentWithRelations } from "@/types";
import SalesAgentActions from "@/components/salesAgents/SalesAgentActions";

export const salesAgentsColumns: ColumnDef<SalesAgentWithRelations>[] = [
  {
    accessorKey: "salesAgent.name",
    header: "Agent Name",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500 font-medium">
          {row.original.salesAgent.name}
        </p>
      );
    },
  },
  {
    accessorKey: "salesAgent.agentCode",
    header: "Agent Code",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">{row.original.salesAgent.agentCode}</p>
      );
    },
  },
  {
    accessorKey: "salesAgent.email",
    header: "Email",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">{row.original.salesAgent.email || "-"}</p>
      );
    },
  },
  {
    accessorKey: "salesAgent.phone",
    header: "Phone",
    cell: ({ row }) => {
      return <p className="text-dark-500">{row.original.salesAgent.phone}</p>;
    },
  },
  {
    accessorKey: "user.name",
    header: "Linked User",
    cell: ({ row }) => {
      return <p className="text-dark-500">{row.original.user?.name || "-"}</p>;
    },
  },
  {
    accessorKey: "salesAgent.isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.salesAgent.isActive;
      return (
        <span
          className={cn("rounded-xl px-3 py-1 text-white capitalize", {
            "bg-green-500": isActive,
            "bg-red-600": !isActive,
          })}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const salesAgent = row.original;
      return <SalesAgentActions salesAgent={salesAgent} />;
    },
  },
];
