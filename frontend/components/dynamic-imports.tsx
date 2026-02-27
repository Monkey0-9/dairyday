"use client"

import dynamic from "next/dynamic"
import { SkeletonCard } from "@/components/ui/skeleton"

// Dynamically import heavy components to reduce initial bundle size

// Chart - use a simple placeholder since the component doesn't exist yet
export const DynamicChart = dynamic(
  () => import("@/components/ui/skeleton").then((mod) => mod.SkeletonCard),
  {
    loading: () => <SkeletonCard className="h-[300px]" />,
    ssr: false,
  }
)

// DataTable - use a simple placeholder since the component doesn't exist yet
export const DynamicDataTable = dynamic(
  () => import("@/components/ui/skeleton").then((mod) => mod.SkeletonCard),
  {
    loading: () => <SkeletonCard className="h-[400px]" />,
  }
)

// Calendar - this exists
export const DynamicCalendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    loading: () => <SkeletonCard className="h-[350px]" />,
    ssr: false,
  }
)

// Map - use a simple placeholder since the component doesn't exist yet
export const DynamicMap = dynamic(
  () => import("@/components/ui/skeleton").then((mod) => mod.SkeletonCard),
  {
    loading: () => <SkeletonCard className="h-[400px]" />,
    ssr: false,
  }
)

// RichText - use a simple placeholder since the component doesn't exist yet
export const DynamicRichText = dynamic(
  () => import("@/components/ui/skeleton").then((mod) => mod.SkeletonCard),
  {
    loading: () => <SkeletonCard className="h-[200px]" />,
    ssr: false,
  }
)
