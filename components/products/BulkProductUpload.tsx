/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import toast from "react-hot-toast";
import { FileUploader } from "../FileUploader";
import { Button } from "../ui/button";
import { useProducts } from "@/hooks/useProducts";
import { read, utils } from "xlsx";
import { useRouter } from "next/navigation";
import Loading from "../loading";

const requiredHeaders = [
  "productID",
  "name",
  "description",
  "taxRateId",
  "quantity",
  "costPrice",
  "sellingPrice",
  "alertQuantity",
  "categoryId",
  "typeId",
  "brandId",
  "unitId",
];

const BulkProductUpload = ({ closeDialog }: { closeDialog?: () => void }) => {
  const { bulkAddProducts, isBulkAddingProducts } = useProducts();
  const router = useRouter();

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;

    try {
      const file = files[0];
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet) as Record<string, any>[];

      // Validate headers
      const headers = Object.keys(jsonData[0] || {});
      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h)
      );

      if (missingHeaders.length) {
        toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
        return;
      }

      // Transform data
      const products = jsonData.map((row) => ({
        productID: String(row.productID),
        name: String(row.name),
        description: String(row.description || ""),
        taxRateId: String(row.taxRateId),
        quantity: Number(row.quantity),
        costPrice: Number(row.costPrice),
        sellingPrice: Number(row.sellingPrice),
        alertQuantity: Number(row.alertQuantity),
        categoryId: String(row.categoryId),
        typeId: String(row.typeId),
        brandId: String(row.brandId),
        unitId: String(row.unitId),
        image: [],
      }));

      // Use the mutation from useProducts
      await bulkAddProducts(products, {
        onSuccess: () => {
          if (closeDialog) {
            closeDialog();
          }
          router.push("/inventory");
        },
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process the file");
    }
  };

  return (
    <div className="space-y-8 w-full mt-6">
      <div className="w-full flex flex-col items-center justify-center gap-5">
        <FileUploader
          accept={{
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
          }}
          maxFiles={1}
          maxSize={5 * 1024 * 1024} // 10MB
          files={[]}
          onChange={handleFileUpload}
          disabled={isBulkAddingProducts}
        />
        {!isBulkAddingProducts && (
          <Button
            asChild
            className="shad-primary-btn"
            disabled={isBulkAddingProducts}
          >
            <a
              href="/assets/product-import-template.xlsx"
              download="product-import-template.xlsx"
            >
              Download Template
            </a>
          </Button>
        )}
      </div>

      {isBulkAddingProducts && (
        <div className="w-full items-center justify-center py-5">
          <Loading />
        </div>
      )}
      {!isBulkAddingProducts && (
        <div>
          <p>Excel file must include these columns:</p>
          <ul className="text-sm list-disc pl-5 mt-2 text-blue-800/80 grid grid-cols-4 gap-2">
            {requiredHeaders.map((header) => (
              <li key={header}>{header}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BulkProductUpload;
