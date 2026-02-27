import { StatsSkeleton, TableSkeleton } from "@/components/skeletons"

export default function AdminLoading() {
    return (
        <div className="space-y-8 animate-liquid-entrance">
            <StatsSkeleton count={4} />
            <TableSkeleton rows={8} cols={5} />
        </div>
    )
}
