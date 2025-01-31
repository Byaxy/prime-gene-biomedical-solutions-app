import { ExpenseFormValidation, ExpenseFormValues } from "@/lib/validation";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";

interface ExpenseFormProps {
  mode: "create" | "edit";
  initialData?: ExpenseFormValues;
  onSubmit: (data: ExpenseFormValues) => Promise<void>;
  onCancel?: () => void;
}
const ExpenseForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: ExpenseFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormValidation),
    defaultValues: initialData || {
      title: "",
      description: "",
      amount: 0,
      expenseDate: new Date(),
    },
  });

  const handleSubmit = async (values: ExpenseFormValues) => {
    setIsLoading(true);
    try {
      await onSubmit(values);
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
        className="space-y-6 text-dark-500"
      >
        <CustomFormField
          fieldType={FormFieldType.DATE_PICKER}
          control={form.control}
          name="expenseDate"
          label="Expense Date"
          dateFormat="MM/dd/yyyy"
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="title"
          label="Expense Title"
          placeholder="Enter expense title"
        />

        <CustomFormField
          fieldType={FormFieldType.AMOUNT}
          control={form.control}
          name="amount"
          label="Amount"
          placeholder="Enter amount"
        />

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="description"
          label="Description"
          placeholder="Enter expense description"
        />

        <div className="flex justify-end gap-4">
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
            {mode === "create" ? "Create Expense" : "Update Expense"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ExpenseForm;
