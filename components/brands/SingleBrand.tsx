import { useQuery } from "@tanstack/react-query";
import Loading from "../loading";
import { getBrandById } from "@/lib/actions/brand.actions";

const SingleBrand = ({ brandId }: { brandId: string }) => {
  const { data: brand, isLoading } = useQuery({
    queryKey: [brandId],
    queryFn: async () => {
      if (!brandId) return null;
      return await getBrandById(brandId as string);
    },
    enabled: !!brandId,
  });
  return (
    <div className="w-fit">
      {isLoading && <Loading />}
      {brand && <span>{brand?.name}</span>}
    </div>
  );
};

export default SingleBrand;
