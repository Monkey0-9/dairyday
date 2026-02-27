import { StatsSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
    return (
        <div className="p-6 space-y-8 animate-liquid-entrance">
            <StatsSkeleton count={3} />
            <TableSkeleton rows={6} cols={4} />
        </div>
    )
}
