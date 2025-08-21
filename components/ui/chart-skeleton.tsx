import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-white rounded-lg shadow-sm p-5 space-y-4", className)}
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

