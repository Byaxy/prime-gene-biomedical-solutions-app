import { getCategoryById } from "@/lib/actions/category.actions";
import { useQuery } from "@tanstack/react-query";
import Loading from "../../app/(dashboard)/loading";

const CategoryPath = ({ categoryPath }: { categoryPath: string }) => {
  const categoryIds = categoryPath
    ? categoryPath.split("/").filter(Boolean)
    : [];

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categoryPath", categoryPath],
    queryFn: async () => {
      if (!categoryIds.length) return [];

      const categoryPromises = categoryIds.map((id) => getCategoryById(id));
      const categoryResults = await Promise.all(categoryPromises);

      // Filter out any null results and maintain order
      return categoryResults.filter(Boolean);
    },
    enabled: categoryIds.length > 0,
  });

  if (isLoading) {
    return <Loading size={20} />;
  }

  if (!categories || categories.length === 0) {
    return <div className="w-fit">-</div>;
  }

  return (
    <div className="w-fit">
      <span>
        {categories.map((category, index) => (
          <span key={categoryIds[index]}>
            {category?.name}
            {index < categories.length - 1 && " / "}
          </span>
        ))}
      </span>
    </div>
  );
};

export default CategoryPath;
