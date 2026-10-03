import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-7 w-8 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
