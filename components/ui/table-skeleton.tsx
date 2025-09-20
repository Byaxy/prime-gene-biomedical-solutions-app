import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-4 pt-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[600px] animate-pulse bg-gray-100 rounded-lg" />
        <Skeleton className="h-10 w-[300px] animate-pulse bg-gray-100 rounded-lg" />
      </div>
      <div className="animate-pulse bg-gray-100 rounded-lg">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex space-x-4 border-b border-gray-300">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
