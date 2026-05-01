'use client';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
  );
}

export function GuestCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function RoomBlockSkeleton() {
  return (
    <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse"></div>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/3" />
      <div className="flex justify-between pt-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
