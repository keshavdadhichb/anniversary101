import { GuestCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4 pt-4">
      <div className="h-14 bg-gray-100 rounded-2xl animate-pulse w-full mb-6"></div>
      <GuestCardSkeleton />
      <GuestCardSkeleton />
      <GuestCardSkeleton />
      <GuestCardSkeleton />
      <GuestCardSkeleton />
    </div>
  );
}
