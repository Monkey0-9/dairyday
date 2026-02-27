import { TableSkeleton, MetricCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBillsLoading() {
    return (
        <div className="bg-transparent text-white space-y-10 pb-12 animate-in fade-in duration-700">
            {/* Cinematic Header Skeleton */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.03] pb-10">
                <div className="space-y-3">
                    <Skeleton className="h-2 w-32 bg-white/5 rounded-full" />
                    <Skeleton className="h-14 w-80 bg-white/5 rounded-2xl" />
                </div>
                <Skeleton className="h-12 w-64 bg-white/5 rounded-xl mt-4 lg:mt-0" />
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCardSkeleton delay="0ms" />
                <MetricCardSkeleton delay="100ms" />
                <MetricCardSkeleton delay="200ms" />
                <MetricCardSkeleton delay="300ms" />
            </div>

            {/* Table Area */}
            <TableSkeleton rows={10} cols={5} />
        </div>
    );
}
