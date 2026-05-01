import { RoomBlockSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-10 pt-4">
      <Skeleton className="h-6 w-1/2 mb-4" />
      
      <div className="space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100">
            <Skeleton className="h-6 w-1/3 mb-6" />
            <div className="grid grid-cols-3 gap-4">
              <RoomBlockSkeleton />
              <RoomBlockSkeleton />
              <RoomBlockSkeleton />
              <RoomBlockSkeleton />
              <RoomBlockSkeleton />
              <RoomBlockSkeleton />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
