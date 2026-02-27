import { MetricCardSkeleton, TimelineSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerRecordsLoading() {
    return (
        <div className="bg-transparent text-foreground space-y-16 pb-12 animate-in fade-in duration-700">
            {/* Header Protocol Skeleton */}
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 border-b border-border/10 pb-16">
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-2 w-32 bg-foreground/[0.05] rounded-full" />
                    </div>
                    <Skeleton className="h-14 w-96 bg-foreground/[0.05] rounded-2xl" />
                </div>
                <div className="flex bg-white/[0.03] border border-white/10 p-1.5 rounded-[2rem] h-14 w-80">
                   <Skeleton className="flex-1 rounded-[1.5rem] bg-white/5" />
                   <div className="flex-1" />
                </div>
                <div className="flex gap-6 items-center">
                    <Skeleton className="h-14 w-64 bg-foreground/[0.02] border border-border/10 rounded-[2rem]" />
                    <Skeleton className="h-16 w-48 bg-foreground/[0.05] rounded-2xl" />
                </div>
            </header>

            {/* Aggregate Summary Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <MetricCardSkeleton delay="0ms" />
                <MetricCardSkeleton delay="100ms" />
                <MetricCardSkeleton delay="200ms" />
            </div>

            {/* Historical Timeline Skeleton */}
            <TimelineSkeleton count={6} />
        </div>
    );
}
