import { CategoryFormValidation, CategoryFormValues } from "@/lib/validation";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { SelectItem } from "../ui/select";
import { useCategories } from "@/hooks/useCategories";
import { usePathname, useRouter } from "next/navigation";
import Loading from "../../app/(dashboard)/loading";
import { Category } from "@/types";

interface CategoryFormProps {
  mode: "create" | "edit";
  initialData?: Category;
  onCancel?: () => void;
}
const CategoryForm = ({ mode, initialData, onCancel }: CategoryFormProps) => {
  const {
    categories,
    isLoading: categoriesLoading,
    addCategory,
    isAddingCategory,
    editCategory,
    isEditingCategory,
  } = useCategories({
    getAllCategories: true,
  });
  const router = useRouter();
  const pathname = usePathname();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormValidation),
    defaultValues: initialData
      ? {
          ...initialData,
          parentId: initialData.parentId ?? undefined,
          description: initialData.description ?? undefined,
        }
      : {
          name: "",
          parentId: undefined,
          description: "",
        },
  });

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      if (mode === "create") {
        await addCategory(values, {
          onSuccess: () => {
            onCancel?.();
          },
        });
      }
      if (mode === "edit" && initialData) {
        await editCategory(
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

  // Create flattened categories with indentation
  const flattenedCategories = categories
    ? getFlattenedCategories(categories)
    : [];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="text-dark-500"
      >
        <div className="flex flex-col space-y-5 overflow-y-auto max-h-[60vh] pb-5 remove-scrollbar">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Category Name"
            placeholder="Enter category name"
          />

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="parentId"
            label="Parent Category"
            placeholder="Select parent category"
            onAddNew={
              pathname !== "/settings/categories" &&
              pathname !== "/inventory/add-inventory"
                ? () => router.push("/settings/categories")
                : undefined
            }
            hideSearch={true}
            key={`parent-category-select-${form.watch("parentId") || ""}`}
          >
            {categoriesLoading && (
              <div className="py-5">
                <Loading />
              </div>
            )}
            {categories &&
              flattenedCategories &&
              flattenedCategories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                  className="text-14-medium cursor-pointer hover:bg-blue-800 hover:text-white"
                  style={{ paddingLeft: `${category.depth * 20}px` }}
                >
                  {category.name}
                </SelectItem>
              ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter category description"
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
            isLoading={isAddingCategory || isEditingCategory}
            className="shad-primary-btn"
          >
            {mode === "create" ? "Create Category" : "Update Category"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;

// Helper types
export type HierarchicalCategory = Category & {
  subCategories?: HierarchicalCategory[];
};

// Helper function to build hierarchical structure
const buildHierarchy = (
  categories: Category[],
  parentId: string | null = null
): HierarchicalCategory[] => {
  return categories
    .filter((category) => category.parentId === parentId)
    .map((category) => ({
      ...category,
      subCategories: buildHierarchy(categories, category.id),
    }));
};

// Flatten hierarchical categories with indentation
export const getFlattenedCategories = (categories: Category[]): Category[] => {
  const hierarchicalCategories = buildHierarchy(categories);
  const result: Category[] = [];

  const flattenCategory = (
    category: HierarchicalCategory,
    level: number = 0
  ) => {
    result.push({
      ...category,
      depth: level,
    });

    // Process subcategories
    if (category.subCategories && category.subCategories.length > 0) {
      category.subCategories.forEach((subCategory) => {
        flattenCategory(subCategory, level + 1);
      });
    }
  };

  hierarchicalCategories.forEach((category) => flattenCategory(category));

  return result;
};
