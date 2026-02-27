import { TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCustomersLoading() {
    return (
        <div className="bg-transparent text-white space-y-10 pb-12 animate-in fade-in duration-700">
            {/* Cinematic Header Skeleton */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.03] pb-10">
                <div className="space-y-3">
                    <Skeleton className="h-2 w-32 bg-white/5 rounded-full" />
                    <Skeleton className="h-14 w-80 bg-white/5 rounded-2xl" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl bg-white/5" />
                    <Skeleton className="h-12 w-40 rounded-xl bg-white/5" />
                </div>
            </header>

            {/* Table Area */}
            <TableSkeleton rows={8} cols={4} />
        </div>
    );
}
