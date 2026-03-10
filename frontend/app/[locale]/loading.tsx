import { MilkPourSkeleton } from "@/components/skeletons"

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-in fade-in zoom-in-95 duration-700">
            <div className="w-full max-w-sm">
                <MilkPourSkeleton />
            </div>
            <p className="mt-8 font-micro text-[10px] uppercase tracking-[0.4em] text-foreground/40 italic">Retrieving secure data...</p>
        </div>
    )
}
