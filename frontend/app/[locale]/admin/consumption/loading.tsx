import { GridSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminConsumptionLoading() {
    return (
        <div className="bg-transparent text-white space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Cinematic Header Skeleton */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.03] pb-10">
                <div className="space-y-3">
                    <Skeleton className="h-2 w-32 bg-white/5 rounded-full shadow-glow-primary/5" />
                    <Skeleton className="h-14 w-96 bg-white/5 rounded-2xl" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-48 bg-white/5 rounded-full" />
                    <Skeleton className="h-10 w-32 bg-white/5 rounded-full" />
                </div>
            </header>

            {/* Matrix Data Grid */}
            <GridSkeleton />
        </div>
    );
}
