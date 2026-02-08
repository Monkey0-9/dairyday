"use client"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="flex flex-row items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      <div className="space-y-3 mt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-[60%]" />
      </div>
    </div>
  )
}

function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-4 border-b pb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function SkeletonStats() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="h-4 w-[100px] mb-4" />
          <Skeleton className="h-8 w-[150px]" />
        </div>
      ))}
    </div>
  )
}

function SkeletonProfile() {
  return (
    <div className="flex flex-col items-center space-y-4 p-8">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="space-y-2 text-center">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px] mx-auto" />
      </div>
      <div className="w-full max-w-md space-y-4 mt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function SkeletonInline({
  width = "100%",
  height = "1rem",
}: {
  width?: string
  height?: string
}) {
  return <Skeleton className="inline-block" style={{ width, height }} />
}

// Daily Entry specific skeletons
function SkeletonDailyEntryHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

function SkeletonDailyEntryStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 text-center">
          <Skeleton className="h-4 w-20 mx-auto mb-2" />
          <Skeleton className="h-8 w-16 mx-auto" />
        </div>
      ))}
    </div>
  )
}

function SkeletonDailyEntryRow() {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-r-none" />
        <Skeleton className="h-12 w-28" />
        <Skeleton className="h-10 w-10 rounded-l-none" />
      </div>
    </div>
  )
}

function SkeletonDailyEntryList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonDailyEntryRow key={i} />
      ))}
    </div>
  )
}

// Dashboard specific skeletons
function SkeletonDashboardHeader() {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-36" />
    </div>
  )
}

function SkeletonBillHero() {
  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-lg">
      <Skeleton className="h-8 w-24 mx-auto mb-4" />
      <Skeleton className="h-16 w-48 mx-auto mb-4" />
      <Skeleton className="h-6 w-36 mx-auto mb-6" />
      <Skeleton className="h-14 w-full max-w-md mx-auto" />
    </div>
  )
}

function SkeletonDashboardMetric() {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-24 mx-auto" />
    </div>
  )
}

function SkeletonDashboardTable() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="bg-gray-100 px-6 py-4 border-b">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-gray-100 px-6 py-4 border-t">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  )
}

function SkeletonConsumptionGrid() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {/* Header row */}
          <div className="flex gap-2">
            <Skeleton className="h-8 w-48" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-12" />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-48" />
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-12" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonStats,
  SkeletonProfile,
  SkeletonInline,
  // Daily Entry
  SkeletonDailyEntryHeader,
  SkeletonDailyEntryStats,
  SkeletonDailyEntryRow,
  SkeletonDailyEntryList,
  // Dashboard
  SkeletonDashboardHeader,
  SkeletonBillHero,
  SkeletonDashboardMetric,
  SkeletonDashboardTable,
  // Consumption Grid
  SkeletonConsumptionGrid,
}

