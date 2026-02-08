"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface RevenueData {
    month: string
    revenue: number
    previousYear?: number
}

interface RevenueChartProps {
    data: RevenueData[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <Card className="transition-shadow duration-300 hover:shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Revenue Trend</CardTitle>
                <p className="text-sm text-muted-foreground">Monthly revenue over time</p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="month"
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null
                                return (
                                    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                                        <p className="font-semibold text-sm">{payload[0].payload.month}</p>
                                        <p className="text-primary text-sm mt-1">
                                            Revenue: {formatCurrency(payload[0].value as number)}
                                        </p>
                                        {payload[0].payload.previousYear && (
                                            <p className="text-muted-foreground text-xs mt-0.5">
                                                Last year: {formatCurrency(payload[0].payload.previousYear)}
                                            </p>
                                        )}
                                    </div>
                                )
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                            activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                        />
                        {data.some(d => d.previousYear) && (
                            <Line
                                type="monotone"
                                dataKey="previousYear"
                                stroke="hsl(var(--muted-foreground))"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
