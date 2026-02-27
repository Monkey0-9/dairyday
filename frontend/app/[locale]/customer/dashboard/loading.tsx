import { HeroSkeleton, MetricCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerDashboardLoading() {
    return (
        <div className="bg-transparent text-foreground space-y-12 pb-12 animate-in fade-in duration-700">
            {/* Header Protocol Skeleton */}
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 border-b border-border/10 pb-10">
                <div className="space-y-3">
                    <Skeleton className="h-2 w-32 bg-foreground/[0.05] rounded-full" />
                    <Skeleton className="h-14 w-80 bg-foreground/[0.05] rounded-2xl" />
                </div>
                <Skeleton className="h-12 w-48 bg-foreground/[0.05] rounded-xl" />
            </header>

            {/* Global Hub Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Reconciliation Node Skeleton */}
                <div className="lg:col-span-8">
                    <HeroSkeleton />
                </div>

                {/* Tactical Analytics Rails Skeleton */}
                <div className="lg:col-span-4 grid grid-cols-1 gap-10">
                    <MetricCardSkeleton delay="100ms" />
                    <MetricCardSkeleton delay="200ms" />
                </div>
            </div>

            {/* Operational Grid Nodes Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full bg-foreground/[0.02] border border-border/10 rounded-[1.5rem]" />
                ))}
            </div>
        </div>
    );
}
