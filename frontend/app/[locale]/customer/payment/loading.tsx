import { HeroSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerPaymentLoading() {
    return (
        <div className="bg-transparent text-foreground space-y-16 pb-12 animate-in fade-in duration-700">
            {/* Page Header Skeleton */}
            <header className="flex flex-col items-center text-center space-y-6 pt-10">
               <Skeleton className="h-6 w-40 bg-foreground/5 rounded-full" />
               <Skeleton className="h-16 w-3/4 bg-foreground/5 rounded-2xl" />
               <Skeleton className="h-4 w-1/2 bg-foreground/5 rounded-full" />
            </header>

            {/* Payment Hero Node Skeleton */}
            <div className="flex justify-center">
                 <div className="w-full max-w-sm">
                    <HeroSkeleton />
                 </div>
            </div>

            {/* History Table Skeleton */}
            <div className="space-y-8">
                <div className="flex items-center gap-6 px-10 py-4 bg-foreground/[0.02] rounded-2xl border border-border/5">
                    <Skeleton className="h-5 w-40 bg-foreground/5 rounded-md" />
                    <div className="h-[1px] flex-1 bg-foreground/5" />
                </div>
                <TableSkeleton rows={5} cols={5} />
            </div>
        </div>
    );
}
