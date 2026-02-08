"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
    title: string
    value: string | number
    change?: number
    changeLabel?: string
    icon: LucideIcon
    iconColor?: string
    trend?: "up" | "down" | "neutral"
}

export function StatsCard({
    title,
    value,
    change,
    changeLabel,
    icon: Icon,
    iconColor = "text-primary",
    trend = "neutral",
}: StatsCardProps) {
    const trendColors = {
        up: "text-green-600 dark:text-green-400",
        down: "text-red-600 dark:text-red-400",
        neutral: "text-gray-600 dark:text-gray-400",
    }

    const trendBg = {
        up: "bg-green-50 dark:bg-green-950/30",
        down: "bg-red-50 dark:bg-red-950/30",
        neutral: "bg-gray-50 dark:bg-gray-950/30",
    }

    return (
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <h3 className="text-3xl font-bold mt-2 tracking-tight">{value}</h3>

                        {change !== undefined && (
                            <div className="flex items-center gap-1 mt-3">
                                <span
                                    className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                                        trendBg[trend],
                                        trendColors[trend]
                                    )}
                                >
                                    {trend === "up" && "↑"}
                                    {trend === "down" && "↓"}
                                    {Math.abs(change).toFixed(1)}%
                                </span>
                                {changeLabel && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                        {changeLabel}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        "bg-gradient-to-br from-primary/20 to-primary/5",
                        "dark:from-primary/10 dark:to-primary/5"
                    )}>
                        <Icon className={cn("h-6 w-6", iconColor)} />
                    </div>
                </div>
            </CardContent>

            {/* Decorative gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        </Card>
    )
}
