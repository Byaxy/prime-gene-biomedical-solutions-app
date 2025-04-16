import { ProductWithRelations } from "@/types";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import { formatDateTime } from "@/lib/utils";
import Image from "next/image";

const ProductDetails = ({ product }: { product: ProductWithRelations }) => {
  return (
    <div className="w-full overflow-y-auto max-h-[70vh] remove-scrollbar">
      <div className="w-full flex flex-col gap-5">
        <Image
          src={product.product.imageUrl || "/assets/images/placeholder.jpg"}
          width={150}
          height={150}
          alt="current image"
          className="max-h-[400px] lg:w-[400px] overflow-hidden object-contain"
          priority={true}
        />
        <Table>
          <TableBody className="py-5">
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Product ID</TableCell>
              <TableCell className="text-16-regular">
                {product.product.productID}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Name</TableCell>
              <TableCell className="text-16-regular">
                {product.product.name}
              </TableCell>
            </TableRow>

            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Category</TableCell>
              <TableCell className="text-16-regular">
                {product.category.name}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Brand</TableCell>
              <TableCell className="text-16-regular">
                {product.brand.name}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Type</TableCell>
              <TableCell className="text-16-regular">
                {product.type.name}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Unit</TableCell>
              <TableCell className="text-16-regular">
                {product.unit.name}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Cost Price</TableCell>
              <TableCell className="text-16-regular">
                {product.product.costPrice}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Selling Price</TableCell>
              <TableCell className="text-16-regular">
                {product.product.sellingPrice}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">
                Quantity on Hand
              </TableCell>
              <TableCell className="text-16-regular">
                {product.product.quantity}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">
                Min Reorder Level
              </TableCell>
              <TableCell className="text-16-regular">
                {product.product.alertQuantity}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">
                Max Reorder Level
              </TableCell>
              <TableCell className="text-16-regular">
                {product.product.maxAlertQuantity}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Description</TableCell>
              <TableCell className="text-16-regular">
                {product.product.description || "N/A"}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Created At</TableCell>
              <TableCell className="text-16-regular">
                {formatDateTime(product.product.createdAt).dateTime}
              </TableCell>
            </TableRow>
            <TableRow className="border-b border-dark-700">
              <TableCell className="text-16-semibold">Last Updated</TableCell>
              <TableCell className="text-16-regular">
                {formatDateTime(product.product.createdAt).dateTime}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductDetails;
