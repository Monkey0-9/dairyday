import { MetricCardSkeleton, TimelineSkeleton } from "@/components/skeletons"

export default function CustomerLoading() {
    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCardSkeleton delay="0ms" />
                <MetricCardSkeleton delay="100ms" />
                <MetricCardSkeleton delay="200ms" />
            </div>
            <TimelineSkeleton count={5} />
        </div>
    )
}
