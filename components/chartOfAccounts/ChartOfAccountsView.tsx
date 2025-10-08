"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Folder, FolderOpen, List, Table2 } from "lucide-react";
import { ChartOfAccountWithRelations } from "@/types";
import { cn } from "@/lib/utils";

import ChartOfAccountsActions from "./ChartOfAccountsActions";

interface ChartOfAccountsViewProps {
  accounts: ChartOfAccountWithRelations[];
}

type ViewMode = "tree" | "list";

const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({
  accounts,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Toggle expansion of a node
  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Flatten the tree for list view or client-side search, while maintaining depth info
  const flattenedAccounts = useMemo(() => {
    const flatten = (
      nodes: ChartOfAccountWithRelations[],
      depth = 0,
      prefix = ""
    ): (ChartOfAccountWithRelations & {
      depth: number;
      displayPrefix: string;
    })[] => {
      let result: (ChartOfAccountWithRelations & {
        depth: number;
        displayPrefix: string;
      })[] = [];
      nodes.forEach((node) => {
        const currentPrefix = prefix
          ? `${prefix} / ${node.account.accountName}`
          : node.account.accountName;
        result.push({ ...node, depth, displayPrefix: currentPrefix });
        if (node.children && node.children.length > 0) {
          result = result.concat(
            flatten(node.children, depth + 1, currentPrefix)
          );
        }
      });
      return result;
    };
    return flatten(accounts);
  }, [accounts]);

  // Filter accounts client-side if server-side filtering is not desired for tree view, or for list view
  const filteredFlattenedAccounts = useMemo(() => {
    return flattenedAccounts.filter(
      (acc) =>
        acc.account.accountName?.toLowerCase() ||
        acc.account.accountType?.toLowerCase() ||
        acc.displayPrefix.toLowerCase()
    );
  }, [flattenedAccounts]);

  // --- Recursive Tree Renderer Component ---
  const renderTreeRows = (nodes: ChartOfAccountWithRelations[], depth = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.account.id}>
        <TableRow
          className={cn("hover:bg-blue-50/50", {
            "bg-blue-100/30 font-semibold": depth === 0,
            "bg-blue-50/20": depth > 0 && depth % 2 === 0,
          })}
        >
          <TableCell style={{ paddingLeft: `${1.5 + depth * 1.5}rem` }}>
            {node.children && node.children.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleExpand(node.account.id)}
                className="mr-1 h-6 w-6"
              >
                {expandedNodes.has(node.account.id) ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <span style={{ marginLeft: "2rem" }}></span>
            )}
            <span>{node.account.accountName}</span>
          </TableCell>
          <TableCell className="capitalize">
            {node.account.accountType}
          </TableCell>
          <TableCell>{node.account.isControlAccount ? "Yes" : "No"}</TableCell>
          <TableCell>{node.account.isDefault ? "Yes" : "No"}</TableCell>
          <TableCell>
            <ChartOfAccountsActions account={node} />
          </TableCell>
        </TableRow>
        {expandedNodes.has(node.account.id) &&
          node.children &&
          node.children.length > 0 &&
          renderTreeRows(node.children, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <Card className="flex-1 bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="w-full flex items-center justify-end">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === "tree" ? "list" : "tree")}
            className="flex items-center space-x-1 border-blue-800 hover:bg-blue-800 hover:text-white"
            size={"sm"}
          >
            {viewMode === "tree" ? (
              <>
                <Table2 className="h-4 w-4" />
                <span>List View</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4" />
                <span>Tree View</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "tree" ? (
          <Table>
            <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Control Account</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-gray-500"
                  >
                    No Chart of Accounts data found.
                  </TableCell>
                </TableRow>
              ) : (
                renderTreeRows(accounts)
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Control</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlattenedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-gray-500"
                  >
                    No Chart of Accounts match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlattenedAccounts.map((node) => (
                  <TableRow
                    key={node.account.id}
                    className="hover:bg-blue-50/50"
                  >
                    <TableCell>{node.account.accountName}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {node.account.path}
                    </TableCell>
                    <TableCell className="capitalize">
                      {node.account.accountType}
                    </TableCell>
                    <TableCell>
                      {node.account.isControlAccount ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      <ChartOfAccountsActions account={node} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartOfAccountsView;
