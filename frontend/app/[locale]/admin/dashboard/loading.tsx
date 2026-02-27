import { MetricCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
    return (
        <div className="bg-transparent text-white space-y-12 pb-12 animate-in fade-in duration-700">
            {/* Cinematic Header Skeleton */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.03] pb-10">
                <div className="space-y-3">
                    <Skeleton className="h-2 w-32 bg-white/5 rounded-full" />
                    <Skeleton className="h-14 w-64 bg-white/5 rounded-2xl" />
                </div>
                <Skeleton className="h-12 w-48 bg-white/5 rounded-xl mt-4 lg:mt-0" />
            </header>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCardSkeleton delay="0ms" />
                <MetricCardSkeleton delay="100ms" />
                <MetricCardSkeleton delay="200ms" />
                <MetricCardSkeleton delay="300ms" />
            </div>

            {/* Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Skeleton className="h-3 w-40 bg-white/5 rounded-full" />
                    <Skeleton className="h-[300px] w-full bg-white/[0.02] border border-white/5 rounded-[2rem]" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-3 w-40 bg-white/5 rounded-full" />
                    <Skeleton className="h-[300px] w-full bg-white/[0.02] border border-white/5 rounded-[2rem]" />
                </div>
            </div>
        </div>
    );
}
