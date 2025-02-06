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
import { storage } from "@/lib/appwrite-client";
import { ID } from "appwrite";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

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
    mutationFn: async (data: ProductFormValues) => {
      let imageId = "";
      let imageUrl = "";

      if (data.image && data.image.length > 0) {
        try {
          const file = data.image[0]; // Get the first file
          imageId = ID.unique();

          // Upload the file
          const upload = await storage.createFile(BUCKET_ID!, imageId, file);

          // Get the file view URL
          if (upload) {
            imageUrl = storage.getFileView(BUCKET_ID!, imageId).toString();
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error("Failed to upload product image");
        }
      }

      const productData = {
        name: data.name,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        categoryId: data.categoryId,
        typeId: data.typeId,
        materialId: data.materialId,
        colorId: data.colorId,
        unitId: data.unitId,
        description: data.description,
        imageId,
        imageUrl,
      };

      return addProduct(productData);
    },
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
      mutationFn: async ({
        id,
        data,
        prevImageId,
      }: {
        id: string;
        data: ProductFormValues;
        prevImageId?: string;
      }) => {
        console.log("Data", data); // Log the data
        let imageId = "";
        let imageUrl = "";

        if (prevImageId && data.image && data.image.length > 0) {
          try {
            storage.deleteFile(BUCKET_ID!, prevImageId);
          } catch (error) {
            console.warn("Error deleting previous image:", error);
          }
        }

        if (data.image && data.image.length > 0) {
          try {
            const file = data.image[0]; // Get the first file
            imageId = ID.unique();

            // Upload the file
            const upload = await storage.createFile(BUCKET_ID!, imageId, file);

            // Get the file view URL
            if (upload) {
              imageUrl = storage.getFileView(BUCKET_ID!, imageId).toString();
            }
          } catch (error) {
            console.error("Error uploading file:", error);
            throw new Error("Failed to upload product image");
          }
        }

        const productData = {
          name: data.name,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          quantity: data.quantity,
          categoryId: data.categoryId,
          typeId: data.typeId,
          materialId: data.materialId,
          colorId: data.colorId,
          unitId: data.unitId,
          description: data.description,
          imageId,
          imageUrl,
        };

        return editProduct(productData, id);
      },
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
