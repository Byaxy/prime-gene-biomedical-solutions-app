import Loading from "../../app/(dashboard)/loading";
import { useCategories } from "@/hooks/useCategories";
import { Category } from "@/types";

const SingleCategory = ({ categoryId }: { categoryId: string }) => {
  const { categories: allCategories, isLoading } = useCategories({
    getAllCategories: true,
  });

  const category = allCategories?.find(
    (cat: Category) => cat.id === categoryId
  );

  if (isLoading) {
    return <Loading size={20} />;
  }

  if (!category) {
    return <div className="w-fit">-</div>;
  }

  return (
    <div className="w-fit">{category && <span>{category?.name}</span>}</div>
  );
};

export default SingleCategory;
