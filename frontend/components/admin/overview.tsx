"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border dark:border-white/[0.1] bg-popover dark:bg-[#111111]/90 p-2 shadow-xl backdrop-blur-md">
        <p className="text-[10px] items-center font-bold text-muted-foreground dark:text-neutral-400 mb-1 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-foreground dark:text-white">
          ₹{payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

interface OverviewProps {
  data: any[]
}

export function Overview({ data }: OverviewProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="month"
          stroke="#888888" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Bar
          dataKey="revenue"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary dark:fill-indigo-500 hover:opacity-80 transition-opacity duration-300"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
