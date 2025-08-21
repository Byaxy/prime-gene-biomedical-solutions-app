import { getCategoryById } from "@/lib/actions/category.actions";
import { useQuery } from "@tanstack/react-query";
import Loading from "../../app/(dashboard)/loading";

const SingleCategory = ({ categoryId }: { categoryId: string }) => {
  const { data: category, isLoading } = useQuery({
    queryKey: [categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      return await getCategoryById(categoryId as string);
    },
    enabled: !!categoryId,
  });
  return (
    <div className="w-fit">
      {isLoading && <Loading />}
      {category && <span>{category?.name}</span>}
    </div>
  );
};

export default SingleCategory;
