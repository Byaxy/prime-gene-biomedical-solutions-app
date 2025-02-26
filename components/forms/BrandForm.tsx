import { BrandFormValidation, BrandFormValues } from "@/lib/validation";
import { Brand } from "@/types/appwrite.types";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { FileUploader } from "../FileUploader";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";

interface BrandFormProps {
  mode: "create" | "edit";
  initialData?: Brand;
  onSubmit: (data: BrandFormValues, prevImageId?: string) => Promise<void>;
  onCancel?: () => void;
}

const BrandForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: BrandFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(BrandFormValidation),
    defaultValues: initialData || {
      name: "",
      description: "",
      image: [],
    },
  });

  const handleSubmit = async (values: BrandFormValues) => {
    setIsLoading(true);
    try {
      if (
        mode === "edit" &&
        values?.image &&
        values?.image.length > 0 &&
        initialData?.imageId
      ) {
        await onSubmit(values, initialData?.imageId);
      } else {
        await onSubmit(values);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 text-dark-500"
      >
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
          <SubmitButton isLoading={isLoading} className="shad-primary-btn">
            {mode === "create" ? "Create Brand" : "Update Brand"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default BrandForm;
