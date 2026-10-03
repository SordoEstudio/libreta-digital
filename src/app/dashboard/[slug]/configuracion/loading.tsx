import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-16 rounded-full self-center" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="size-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
