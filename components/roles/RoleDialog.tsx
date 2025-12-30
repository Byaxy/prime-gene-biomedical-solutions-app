"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RoleWithPermissions } from "@/types";
import { useRoles } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";

interface RoleDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: () => void;
  role: RoleWithPermissions;
}

const RoleDialog: React.FC<RoleDialogProps> = ({
  mode,
  open,
  onOpenChange,
  role,
}) => {
  const { user } = useAuth();
  const { deleteRole, isDeletingRole } = useRoles();

  const handleDelete = async () => {
    try {
      if (role.role.isSystemRole) {
        toast.error("Cannot delete system roles");
        return;
      }

      if (role?.role?.id && user?.id) {
        await deleteRole(
          { roleId: role.role.id },
          {
            onSuccess: () => {
              toast.success("Role deleted successfully.");
              onOpenChange();
            },
            onError: (error) => {
              console.error("Error deleting role:", error);
              toast.error(error.message || "Failed to delete role.");
            },
          }
        );
      } else {
        throw new Error("Role ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deletion.");
    }
  };

  if (!role?.role) {
    return null;
  }

  // Group permissions by category
  const permissionsByCategory = role.permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof role.permissions>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-7xl bg-light-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element) {
            if (
              e.target.closest('[role="listbox"]') ||
              e.target.closest("[data-radix-select-viewport]") ||
              e.target.closest("[data-radix-popper-content]")
            ) {
              e.preventDefault();
              return;
            }
          }

          const event = e.detail.originalEvent;
          if (event instanceof PointerEvent) {
            event.stopPropagation();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Delete Role"
              : `Role Details: ${role.role.name}`}
          </DialogTitle>
          <DialogDescription
            className={cn("text-dark-500", mode === "delete" && "text-red-600")}
          >
            {mode === "delete"
              ? "Are you sure you want to delete this role? This action cannot be undone."
              : `Detailed information for ${role.role.name} role.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-dark-600">
              <div className="space-y-2">
                <p className="font-semibold text-blue-800">Role Name:</p>
                <p>{role.role.name}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-blue-800">Type:</p>
                <p>
                  <span
                    className={cn(
                      "text-14-medium capitalize px-3 py-1 rounded-xl text-white",
                      role.role.isSystemRole ? "bg-blue-800" : "bg-gray-600"
                    )}
                  >
                    {role.role.isSystemRole ? "System Role" : "Custom Role"}
                  </span>
                </p>
              </div>
              <div className="col-span-2 space-y-2">
                <p className="font-semibold text-blue-800">Description:</p>
                <p>{role.role.description || "No description provided"}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-blue-800">Created At:</p>
                <p>{formatDateTime(role.role.createdAt).dateTime}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-blue-800">Last Updated:</p>
                <p>{formatDateTime(role.role.updatedAt).dateTime}</p>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Permissions ({role.permissions.length} routes)
              </h3>

              <div className="space-y-4">
                {Object.entries(permissionsByCategory).map(
                  ([category, perms]) => (
                    <div
                      key={category}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="bg-blue-100 p-3">
                        <h4 className="font-semibold text-blue-800">
                          {category} ({perms.length})
                        </h4>
                      </div>
                      <Table className="border-0">
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
                        <TableBody className="bg-white">
                          {perms.map((perm, index) => (
                            <TableRow
                              key={perm.id}
                              className={cn({
                                "bg-blue-50": index % 2 === 1,
                              })}
                            >
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">
                                    {perm.routeTitle}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {perm.route}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {perm.canCreate ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {perm.canRead ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {perm.canUpdate ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {perm.canDelete ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "delete" && (
          <div className="flex justify-end gap-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onOpenChange}
              disabled={isDeletingRole}
              className="shad-primary-btn"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeletingRole}
              className="shad-danger-btn"
            >
              {isDeletingRole ? "Deleting..." : "Delete Role"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;
