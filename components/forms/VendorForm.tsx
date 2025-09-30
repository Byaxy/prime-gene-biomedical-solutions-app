"use client";

import { VendorFormValidation, VendorFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Vendor } from "@/types";
import { useVendors } from "@/hooks/useVendors";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface VendorFormProps {
  mode: "create" | "edit";
  initialData?: Vendor;
  onCancel?: () => void;
}

const VendorForm = ({ mode, initialData, onCancel }: VendorFormProps) => {
  const { addVendor, isAddingVendor, editVendor, isEditingVendor } =
    useVendors();

  const router = useRouter();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(VendorFormValidation),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const handleSubmit = async (values: VendorFormValues) => {
    try {
      if (mode === "create") {
        await addVendor(values, {
          onSuccess: () => {
            toast.success("Vendor created successfully!");
            form.reset();
            router.push("/vendors");
          },
          onError: (error) => {
            console.error("Create vendor error:", error);
            toast.error("Failed to create vendor");
          },
        });
        onCancel?.();
      } else if (mode === "edit") {
        if (!initialData?.id) {
          throw new Error("Vendor ID is required for editing");
        }
        await editVendor(
          { id: initialData.id, data: values },
          {
            onSuccess: () => {
              toast.success("Vendor updated successfully!");
              form.reset();
              router.push("/vendors");
            },
            onError: (error) => {
              console.error("Edit vendor error:", error);
              toast.error("Failed to update vendor");
            },
          }
        );
        onCancel?.();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Name"
          placeholder="Enter vendor name"
        />
        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email"
            placeholder="johndoe@gmail.com"
          />

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone number"
            placeholder="(555) 123-4567"
          />
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="address"
          label="Address"
          placeholder="Enter vendor address"
        />

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            onClick={() => {
              form.reset();
              onCancel?.();
            }}
            className="shad-danger-btn"
          >
            Cancel
          </Button>
          <SubmitButton
            isLoading={isAddingVendor || isEditingVendor}
            className="shad-primary-btn"
          >
            {mode === "create" ? "Create Vendor" : "Update Vendor"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default VendorForm;
