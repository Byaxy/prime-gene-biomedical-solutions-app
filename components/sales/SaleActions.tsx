import { Sale } from "@/types/appwrite.types";
import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { FileText } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import SaleDialog from "./SaleDialog";
import SaleInvoicePreview from "./SaleInvoicePreview";
import { useRouter } from "next/navigation";

const SaleActions = ({ sale }: { sale: Sale }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "preview">(
    "add"
  );

  const { deleteSale, isDeletingSale } = useSales();
  const router = useRouter();

  const handleAction = async () => {
    try {
      if (mode === "delete") {
        await deleteSale(sale.$id, {
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
        onClick={() => {
          setMode("preview");
          setOpen(true);
        }}
        className="text-green-500 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <FileText className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("edit");
          router.push(`/sales/edit-invoice/${sale.$id}`);
        }}
        className="text-[#475BE8] p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>

      <SaleDialog
        mode="delete"
        open={open && mode === "delete"}
        onOpenChange={setOpen}
        sale={sale}
        onSubmit={handleAction}
        isLoading={isDeletingSale}
      />
      <SaleInvoicePreview
        sale={sale}
        open={open && mode === "preview"}
        onOpenChange={setOpen}
      />
    </div>
  );
};

export default SaleActions;
