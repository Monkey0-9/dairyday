import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#1a1a25]", className)}
      {...props}
    />
  )
}

// Pre-built skeleton patterns
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-[#12121a]/60 p-6 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <Skeleton className="h-20 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  )
}

function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-[#12121a]/60 p-5 space-y-3", className)}>
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="h-8 w-16 rounded" />
      <Skeleton className="h-3 w-32 rounded" />
    </div>
  )
}

function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-4 pb-3 border-b border-white/5">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-4 w-20 rounded flex-1" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

function SkeletonList({ items = 4, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#12121a]/40">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}

function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonStat, SkeletonTable, SkeletonList, SkeletonGrid }
