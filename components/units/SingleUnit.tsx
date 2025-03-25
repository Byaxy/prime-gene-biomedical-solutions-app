import { useQuery } from "@tanstack/react-query";
import Loading from "../loading";
import { getUnitById } from "@/lib/actions/unit.actions";

const SingleUnit = ({
  unitId,
  showCode,
}: {
  unitId: string;
  showCode?: boolean;
}) => {
  const { data: unit, isLoading } = useQuery({
    queryKey: [unitId],
    queryFn: async () => {
      if (!unitId) return null;
      return await getUnitById(unitId as string);
    },
    enabled: !!unitId,
  });
  return (
    <div className="w-fit">
      {isLoading && <Loading />}
      {unit && <span>{showCode ? unit?.code : unit?.name}</span>}
    </div>
  );
};

export default SingleUnit;
