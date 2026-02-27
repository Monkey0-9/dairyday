import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ─── Premium Skeleton Components ─── */

export const MetricCardSkeleton = ({ delay = "0ms" }: { delay?: string }) => (
    <div 
        className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between relative overflow-hidden h-[120px] animate-in fade-in slide-in-from-bottom-2 duration-700"
        style={{ "--animation-delay": delay } as React.CSSProperties}
    >
        <div className="flex justify-between items-start">
            <Skeleton className="h-7 w-7 rounded-lg bg-white/5" />
            <Skeleton className="h-2 w-12 bg-white/5 rounded-full" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-3 w-16 bg-white/5 rounded-full" />
            <Skeleton className="h-6 w-24 bg-white/5 rounded-lg" />
        </div>
        <div className="absolute inset-x-0 -bottom-1 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
    </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
    <div className="w-full space-y-6 animate-in fade-in duration-1000">
        {/* Search/Filter Bar Placeholder */}
        <div className="flex flex-col md:flex-row gap-4 bg-obsidian-800/20 p-3 rounded-2xl border border-white/[0.02]">
            <Skeleton className="h-10 flex-1 bg-white/5 rounded-xl" />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-24 bg-white/5 rounded-xl" />
                <Skeleton className="h-10 w-10 bg-white/5 rounded-xl" />
            </div>
        </div>

        {/* Table Placeholder */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="h-12 bg-white/[0.03] border-b border-white/5 px-6 flex items-center gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className={cn("h-3 bg-white/5 rounded-full", i === 0 ? "w-40" : "flex-1")} />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-6 py-5 border-b border-white/[0.01] flex items-center gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton 
                            key={j} 
                            className={cn(
                                "h-4 bg-white/5 rounded-md", 
                                j === 0 ? "w-48" : "flex-1",
                                i % 2 === 0 && j > 0 ? "opacity-40" : "opacity-70"
                            )} 
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const HeroSkeleton = () => (
    <div className="p-10 rounded-[2.5rem] bg-obsidian-800/40 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-1000">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-4 flex-1">
                <Skeleton className="h-3 w-32 bg-white/5 rounded-full tracking-[0.3em]" />
                <Skeleton className="h-16 w-3/4 bg-white/5 rounded-2xl" />
                <div className="flex gap-4 pt-4">
                    <Skeleton className="h-14 w-48 bg-white/5 rounded-xl" />
                    <Skeleton className="h-14 w-14 bg-white/5 rounded-xl" />
                </div>
            </div>
            <div className="w-full md:w-64 space-y-4">
                <Skeleton className="h-24 w-full bg-white/5 rounded-2xl" />
                <Skeleton className="h-24 w-full bg-white/5 rounded-2xl opacity-50" />
            </div>
        </div>
    </div>
);

export const TimelineSkeleton = ({ count = 5 }: { count?: number }) => (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-700">
        <div className="flex items-center gap-6 px-10 py-4 bg-white/[0.01] rounded-2xl border border-white/5">
            <Skeleton className="h-3 w-40 bg-white/5 rounded-full" />
            <div className="h-[1px] flex-1 bg-white/5" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
            <div 
                key={i} 
                className="p-8 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] flex items-center justify-between opacity-50"
                style={{ "--item-opacity": 1 - (i * 0.15) } as React.CSSProperties}
            >
                <div className="flex items-center gap-8">
                    <Skeleton className="h-16 w-16 rounded-2xl bg-white/5" />
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-48 bg-white/5 rounded-lg" />
                        <Skeleton className="h-3 w-24 bg-white/5 rounded-full" />
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <Skeleton className="h-12 w-32 bg-white/5 rounded-xl" />
                    <Skeleton className="h-12 w-12 rounded-full bg-white/5" />
                </div>
            </div>
        ))}
    </div>
);

export const GridSkeleton = () => (
    <div className="rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in duration-1000">
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <Skeleton className="h-8 w-48 bg-white/5 rounded-lg" />
            <Skeleton className="h-8 w-32 bg-white/5 rounded-full" />
        </div>
        <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
                {/* Header Row */}
                <div className="flex border-b border-white/5 p-4 gap-4 bg-white/[0.01]">
                    <Skeleton className="h-4 w-40 bg-white/5 rounded-md" />
                    {Array.from({ length: 15 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-8 bg-white/5 rounded-md flex-1" />
                    ))}
                </div>
                {/* Data Rows */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex border-b border-white/[0.02] p-4 gap-4 items-center">
                        <Skeleton className="h-12 w-40 bg-white/5 rounded-lg" />
                        {Array.from({ length: 15 }).map((_, j) => (
                            <Skeleton key={j} className="h-10 w-8 bg-white/5 rounded-lg flex-1 opacity-20" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// Legacy exports for backward compatibility if needed temporarily
export const StatsSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
            <MetricCardSkeleton key={i} delay={`${i * 100}ms`} />
        ))}
    </div>
);

export const DailyEntrySkeleton = ({ count = 8 }: { count?: number }) => (
    <TimelineSkeleton count={count} />
);
