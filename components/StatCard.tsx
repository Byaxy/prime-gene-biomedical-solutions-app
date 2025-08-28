import { formatNumber } from "@/lib/utils";
import FormatNumber from "./FormatNumber";
import { Card, CardContent } from "./ui/card";

const StatCard = ({
  title,
  value,
  icon: Icon,
  color = "text-blue-600",
  bgColor = "bg-blue-50",
  isLoading = false,
  isCurrency,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  bgColor?: string;
  isLoading?: boolean;
  isCurrency?: boolean;
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-blue-800">
              {isLoading ? (
                "..."
              ) : isCurrency ? (
                <FormatNumber value={value} />
              ) : (
                formatNumber(String(value))
              )}
            </p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
