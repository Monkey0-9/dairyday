"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface RecentSalesProps {
  data: any[]
}

export function RecentSales({ data }: RecentSalesProps) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">No recent sales.</div>
  }

  return (
    <div className="space-y-8">
      {data.map((sale) => (
        <div key={sale.id} className="flex items-center group">
          <Avatar className="h-9 w-9 border border-border dark:border-white/[0.1] transition-transform group-hover:scale-105">
            <AvatarImage src={sale.avatar} alt="Avatar" />
            <AvatarFallback className="bg-primary/10 text-primary dark:bg-indigo-500/10 dark:text-indigo-400 font-bold text-xs">{sale.user_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-bold leading-none text-foreground dark:text-white">{sale.user_name}</p>
            <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground dark:text-neutral-500 font-mono text-ellipsis overflow-hidden max-w-[150px]">
                {sale.user_email}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    sale.status === 'PAID' 
                    ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400' 
                    : 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400'
                }`}>
                    {sale.status}
                </span>
            </div>
          </div>
          <div className={`ml-auto font-bold ${sale.status === 'PAID' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
            +₹{sale.amount.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}
