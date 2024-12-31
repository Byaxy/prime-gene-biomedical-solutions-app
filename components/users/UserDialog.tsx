import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateUserFormValues, EditUserFormValues } from "@/lib/validation";
import { Users } from "@/types/appwrite.types";
import UserForm from "../forms/UserForm";

interface UserDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  user?: Users;
  onSubmit: (
    data: CreateUserFormValues | EditUserFormValues,
    prevImageId?: string
  ) => Promise<void>;
}

export function UserDialog({
  mode,
  open,
  onOpenChange,
  user,
  isLoading,
  onSubmit,
}: UserDialogProps) {
  const handleDelete = async () => {
    if (!user) return;

    try {
      const deleteData: EditUserFormValues = {
        name: user.name,
        phone: user.phone,
        role: user.role,
        image: [],
      };

      await onSubmit(deleteData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const dialogTitle = {
    add: "Add User",
    edit: "Edit User",
    delete: "Delete User",
  }[mode];

  const dialogDescription = {
    add: "Add a new user to your collection.",
    edit: "Edit the selected user.",
    delete:
      "Are you sure you want to delete this user? This action cannot be undone.",
  }[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {mode === "delete" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">
              User: <span className="font-semibold">{user?.name}</span>
            </p>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="shad-danger-btn"
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <UserForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && user
                ? {
                    $id: user.$id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    profileImageId: user.profileImageId,
                    profileImageUrl: user.profileImageUrl,
                    $createdAt: user.$createdAt,
                    $updatedAt: user.$updatedAt,
                  }
                : undefined
            }
            onSubmit={(data) => onSubmit(data, user?.profileImageId)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
