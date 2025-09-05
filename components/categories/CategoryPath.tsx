import Loading from "@/app/(dashboard)/loading";
import { useCategories } from "@/hooks/useCategories";
import { Category } from "@/types";

const CategoryPath = ({ categoryPath }: { categoryPath: string }) => {
  const { categories: allCategories, isLoading } = useCategories({
    getAllCategories: true,
  });
  const categoryIds = categoryPath
    ? categoryPath.split("/").filter(Boolean)
    : [];

  const categories = allCategories
    ?.map((category: Category) => {
      const cat = categoryIds.find((id) => id === category.id);
      if (cat) return category;
    })
    .filter(Boolean);

  if (isLoading) {
    return <Loading size={20} />;
  }

  if (!categories || categories.length === 0) {
    return <div className="w-fit">-</div>;
  }

  return (
    <div className="w-fit">
      {categories && (
        <span>
          {categories.map((category: Category, index: number) => (
            <span key={category.id}>
              {category?.name}
              {index < categories.length - 1 && " / "}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};

export default CategoryPath;
