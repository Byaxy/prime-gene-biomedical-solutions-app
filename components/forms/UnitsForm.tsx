import { UnitFormValidation, UnitFormValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Unit } from "@/types";
import { useUnits } from "@/hooks/useUnits";

interface UnitFormProps {
  mode: "create" | "edit";
  initialData?: Unit;
  onCancel?: () => void;
}

const UnitsForm = ({
  mode,
  initialData,

  onCancel,
}: UnitFormProps) => {
  const { addUnit, editUnit, isAddingUnit, isEditingUnit } = useUnits();
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(UnitFormValidation),
    defaultValues: initialData || {
      name: "",
      code: "",
      description: "",
    },
  });

  const handleSubmit = async (values: UnitFormValues) => {
    try {
      if (mode === "create") {
        await addUnit(values, {
          onSuccess: () => {
            onCancel?.();
          },
        });
      }
      if (mode === "edit" && initialData) {
        await editUnit(
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
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Product Unit Name"
            placeholder="Enter product unit name"
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="code"
            label="Product Unit Code"
            placeholder="Enter product unit code"
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter product unit description"
          />
        </div>

        <div className="flex justify-end gap-4 mt-4">
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
            isLoading={isAddingUnit || isEditingUnit}
            className="shad-primary-btn"
          >
            {mode === "create" ? "Create Unit" : "Update Unit"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default UnitsForm;
