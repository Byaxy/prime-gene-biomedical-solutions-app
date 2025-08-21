"use client";

import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Loading from "../../app/(dashboard)/loading";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

const ProductsOverview = () => {
  const { products, isLoading } = useProducts({ getAllProducts: true });

  const data = [
    {
      name: "Number of Products",
      value: products ? products.length : 0,
      color: "rgba(45,54,99,.75)",
    },
  ];
  return (
    <Card className="w-full bg-white shadow-lg">
      {isLoading ? (
        <div className="w-full flex items-center justify-center h-32">
          <Loading />
        </div>
      ) : (
        <div className="flex flex-row items-center justify-between gap-5 px-5">
          <CardHeader className="space-y-1 p-0">
            <span className="text-lg text-dark-600 font-semibold">
              Number of Products
            </span>
            <CardTitle className="text-xl font-bold">
              {products ? products.length : 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full max-w-32 h-32 p-0 -mr-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="90%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatNumber(String(value))}
                  wrapperClassName="rounded-md shadow-sm border-dark-700"
                  filterNull={true}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </div>
      )}
    </Card>
  );
};

export default ProductsOverview;
