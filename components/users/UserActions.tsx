import { Users } from "@/types/appwrite.types";
import { useState } from "react";
import { UserDialog } from "./UserDialog";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUsers } from "@/hooks/useUsers";
import { UserFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

const UserActions = ({ user }: { user: Users }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const { editUser, deleteUser, isDeletingUser, isEditingUser } = useUsers();
  const { isAdmin } = useAuth();

  const handleAction = async (data: UserFormValues, prevImageId?: string) => {
    try {
      if (mode === "edit") {
        await editUser(
          { id: user.$id, data, prevImageId },
          {
            onSuccess: () => setOpen(false),
          }
        );
        setOpen(false);
      } else if (mode === "delete") {
        await deleteUser(user.$id, {
          onSuccess: () => setOpen(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex items-center">
      <span
        aria-disabled={!isAdmin}
        onClick={() => {
          if (isAdmin) {
            setMode("edit");
            setOpen(true);
          }
          if (!isAdmin) toast.error("Only admins can edit user");
          return;
        }}
        className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        aria-disabled={!isAdmin}
        onClick={() => {
          if (isAdmin) {
            setMode("delete");
            setOpen(true);
          }
          if (!isAdmin) toast.error("Only admins can delete user");
          return;
        }}
        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
      <UserDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        user={user}
        onSubmit={handleAction}
        isLoading={isDeletingUser || isEditingUser}
      />
    </div>
  );
};

export default UserActions;
