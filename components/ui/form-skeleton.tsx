import { Skeleton } from "./skeleton";

const FormSkeleton = () => {
  return (
    <div className="space-y-5 pt-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4 border-b border-gray-300">
            <Skeleton className="h-11 w-full animate-pulse bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="animate-pulse bg-gray-100 rounded-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex space-x-4 border-b border-gray-300">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex space-x-4 border-b border-gray-300">
            <Skeleton className="h-11 w-full animate-pulse bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="w-full">
        <Skeleton className="h-20 w-full animate-pulse bg-gray-100 rounded-lg" />
      </div>
      <div className="flex justify-end gap-4">
        <Skeleton className="h-11 w-[200px] animate-pulse bg-gray-100 rounded-lg" />
        <Skeleton className="h-11 w-[200px] animate-pulse bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
};

export default FormSkeleton;
