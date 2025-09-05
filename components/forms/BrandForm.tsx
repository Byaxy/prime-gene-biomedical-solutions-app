import { BrandFormValidation, BrandFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { FileUploader } from "../FileUploader";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { Brand } from "@/types";
import { useBrands } from "@/hooks/useBrands";

interface BrandFormProps {
  mode: "create" | "edit";
  initialData?: Brand;
  onCancel?: () => void;
}

const BrandForm = ({ mode, initialData, onCancel }: BrandFormProps) => {
  const { addBrand, editBrand, isAddingBrand, isEditingBrand } = useBrands();
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(BrandFormValidation),
    defaultValues: initialData || {
      name: "",
      description: "",
      image: [],
    },
  });

  const handleSubmit = async (values: BrandFormValues) => {
    try {
      if (mode === "create") {
        await addBrand(values, {
          onSuccess: () => {
            onCancel?.();
          },
        });
      }
      if (mode === "edit" && initialData) {
        if (values?.image && values?.image.length > 0 && initialData?.imageId) {
          await editBrand(
            {
              id: initialData.id,
              data: values,
              prevImageId: initialData.imageId,
            },
            {
              onSuccess: () => {
                onCancel?.();
              },
            }
          );
        } else {
          await editBrand(
            {
              id: initialData.id,
              data: values,
            },
            {
              onSuccess: () => {
                onCancel?.();
              },
            }
          );
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="image"
            label="Brand Image"
            renderSkeleton={(field) => (
              <FormControl>
                <FileUploader
                  files={field.value}
                  onChange={field.onChange}
                  mode={mode}
                  currentImageUrl={initialData?.imageUrl}
                />
              </FormControl>
            )}
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Brand Name"
            placeholder="Enter brand name"
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter brand description"
          />
        </div>

        <div className="flex justify-end gap-4 py-5">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
          )}
          <SubmitButton
            isLoading={isAddingBrand || isEditingBrand}
            className="shad-primary-btn"
          >
            {mode === "create" ? "Create Brand" : "Update Brand"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default BrandForm;
