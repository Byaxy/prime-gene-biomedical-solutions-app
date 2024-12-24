import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import {
  addProduct,
  deleteProduct,
  editProduct,
  getProducts,
  softDeleteProduct,
} from "@/lib/actions/product.actions";

export const useProducts = () => {
  const queryClient = useQueryClient();

  // Get all products
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const result = await getProducts();

      if (!result) {
        throw new Error("Failed to fetch products");
      }
      return result;
    },
  });

  // Add product mutation
  const { mutate: addProductMutation, status: addProductStatus } = useMutation({
    mutationFn: (data: ProductFormValues) => addProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product added successfully");
    },
    onError: (error) => {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    },
  });

  // Edit product mutation
  const { mutate: editProductMutation, status: editProductStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: ProductFormValues }) =>
        editProduct(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product updated successfully");
      },
      onError: (error) => {
        console.error("Error updating product:", error);
        toast.error("Failed to update product");
      },
    });

  // Soft Delete product mutation
  const { mutate: softDeleteProductMutation, status: softDeleteProductStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteProduct(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      },
    });

  // Permanently Delete product mutation
  const { mutate: deleteProductMutation, status: deleteProductStatus } =
    useMutation({
      mutationFn: (id: string) => deleteProduct(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Product deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      },
    });

  return {
    products,
    isLoading,
    error,
    addProduct: addProductMutation,
    editProduct: editProductMutation,
    softDeleteProduct: softDeleteProductMutation,
    deleteProduct: deleteProductMutation,
    isAddingProduct: addProductStatus === "pending",
    isEditingProduct: editProductStatus === "pending",
    isDeletingProduct: deleteProductStatus === "pending",
    isSoftDeletingProduct: softDeleteProductStatus === "pending",
  };
};
