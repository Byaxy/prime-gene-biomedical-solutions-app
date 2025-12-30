/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "@/components/CustomFormField";
import SubmitButton from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { RoleWithPermissions } from "@/types";
import { RoleFormValidation, RoleFormValues } from "@/lib/validation";
import { allParentRoutes } from "@/lib/routeUtils";

interface RoleFormProps {
  mode: "create" | "edit";
  initialData?: RoleWithPermissions;
  onSubmit: (data: RoleFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export default function RoleForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting,
}: RoleFormProps) {
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Prepare default permissions
  const defaultPermissions: Record<string, any> = {};

  if (mode === "edit" && initialData) {
    initialData.permissions.forEach((perm) => {
      defaultPermissions[perm.route] = {
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      };
    });
  } else {
    // For create mode, initialize all routes with false
    allParentRoutes.forEach((route) => {
      defaultPermissions[route.path] = {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
      };
    });
  }

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormValidation),
    defaultValues: {
      name: initialData?.role.name || "",
      description: initialData?.role.description || "",
      permissions: defaultPermissions,
    },
  });

  // Group routes by category
  const routesByCategory = allParentRoutes.reduce((acc, route) => {
    if (!acc[route.category]) {
      acc[route.category] = [];
    }
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, typeof allParentRoutes>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSelectAll = (category: string, action: string) => {
    const routes = routesByCategory[category];
    const currentPermissions = form.getValues("permissions");

    routes.forEach((route) => {
      currentPermissions[route.path] = {
        ...currentPermissions[route.path],
        [action]: true,
      };
    });

    form.setValue("permissions", currentPermissions, { shouldValidate: true });
  };

  const handleDeselectAll = (category: string, action: string) => {
    const routes = routesByCategory[category];
    const currentPermissions = form.getValues("permissions");

    routes.forEach((route) => {
      currentPermissions[route.path] = {
        ...currentPermissions[route.path],
        [action]: false,
      };
    });

    form.setValue("permissions", currentPermissions, { shouldValidate: true });
  };

  const handleSubmit = async (data: RoleFormValues) => {
    console.log("Submitting role data:", data);
    try {
      await onSubmit(data);
      toast.success(
        `Role ${mode === "create" ? "created" : "updated"} successfully`
      );
      router.push("/settings/roles");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${mode} role`);
    }
  };

  const handleCancel = () => {
    form.reset();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 text-dark-500"
      >
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">
            Role Information
          </h3>
          <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="name"
                label="Role Name"
                placeholder="e.g., Sales Manager"
                disabled={
                  isSubmitting ||
                  (mode === "edit" && initialData?.role.isSystemRole)
                }
              />
            </div>
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="description"
              label="Description"
              placeholder="Brief description of this role"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">
            Permissions
          </h3>

          <div className="space-y-4">
            {Object.entries(routesByCategory).map(([category, routes]) => (
              <div key={category} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <div
                  className="bg-blue-50 p-4 cursor-pointer hover:bg-blue-100 flex justify-between items-center"
                  onClick={() => toggleCategory(category)}
                >
                  <h4 className="font-semibold text-blue-800">{category}</h4>
                  <span className="text-sm text-blue-800">
                    {expandedCategories.has(category) ? "▼" : "▶"}
                  </span>
                </div>

                {/* Category Content */}
                {expandedCategories.has(category) && (
                  <div className="p-4">
                    {/* Bulk Actions */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAll(category, "canRead")}
                      >
                        Select All Read
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeselectAll(category, "canRead")}
                      >
                        Deselect All Read
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAll(category, "canCreate")}
                      >
                        Select All Create
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeselectAll(category, "canCreate")}
                      >
                        Deselect All Create
                      </Button>
                    </div>

                    {/* Permissions Table */}
                    <Table className="border">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[40%]">Route</TableHead>
                          <TableHead className="w-[15%] text-center">
                            Create
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            Read
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            Update
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            Delete
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routes.map((route, index) => (
                          <TableRow
                            key={route.path}
                            className={cn({
                              "bg-blue-50": index % 2 === 1,
                            })}
                          >
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-sm font-semibold">
                                  {route.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {route.path}
                                </p>
                              </div>
                            </TableCell>
                            {[
                              "canCreate",
                              "canRead",
                              "canUpdate",
                              "canDelete",
                            ].map((action) => (
                              <TableCell key={action} className="text-center">
                                <Checkbox
                                  checked={
                                    form.watch(
                                      `permissions.${route.path}.${action}` as any
                                    ) || false
                                  }
                                  onCheckedChange={(checked) => {
                                    form.setValue(
                                      `permissions.${route.path}.${action}` as any,
                                      checked === true
                                    );
                                  }}
                                  disabled={isSubmitting}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="shad-danger-btn"
          >
            Cancel
          </Button>
          <SubmitButton isLoading={isSubmitting} className="shad-primary-btn">
            {mode === "create" ? "Create Role" : "Update Role"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
