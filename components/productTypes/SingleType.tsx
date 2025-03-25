import { getTypeById } from "@/lib/actions/type.actions";
import { useQuery } from "@tanstack/react-query";
import Loading from "../loading";

const SingleType = ({ typeId }: { typeId: string }) => {
  const { data: type, isLoading } = useQuery({
    queryKey: [typeId],
    queryFn: async () => {
      if (!typeId) return null;
      return await getTypeById(typeId as string);
    },
    enabled: !!typeId,
  });
  return (
    <div className="w-fit">
      {isLoading && <Loading />}
      {type && <span>{type?.name}</span>}
    </div>
  );
};

export default SingleType;
