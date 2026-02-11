"use client"

import { Activity, CreditCard, DollarSign, Users, Milk, Calendar, ArrowUpRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { analyticsApi, consumptionApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/admin/overview"
import { RecentSales } from "@/components/admin/recent-sales"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/context/language-context"

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await analyticsApi.getDashboard()
      return res.data
    },
    refetchInterval: 30000 // Refresh every 30s
  })

  // Loading Skeleton
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Error State
  if (error) {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Failed to load dashboard</h3>
                <p className="text-sm text-muted-foreground">Using cached data if available...</p>
            </div>
        </div>
    )
  }

  const handleDownloadReport = async () => {
    try {
      const month = format(new Date(), 'yyyy-MM')
      const response = await consumptionApi.export(month)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `dairy-report-${month}.csv`) 
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      
      toast.success("Report downloaded successfully")
    } catch (err) {
      toast.error("Failed to download report")
      console.error(err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">{t('dashboard')}</h2>
            <p className="text-muted-foreground dark:text-neutral-400 mt-1">Real-time overview of your dairy operations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-10 px-4 py-2 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border dark:border-white/[0.08] text-sm text-muted-foreground dark:text-neutral-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span>{format(new Date(), 'MMM yyyy')}</span>
          </div>
          <Button 
            onClick={handleDownloadReport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md dark:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-95"
          >
            Download Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
            title="Total Revenue" 
            value={`₹${data?.monthly_revenue?.toLocaleString() ?? 0}`}
            subtext={`${data?.monthly_growth > 0 ? '+' : ''}${data?.monthly_growth}% from last month`}
            icon={DollarSign}
        />
        <StatsCard 
            title="Subscriptions" 
            value={`+${data?.total_customers ?? 0}`}
            subtext={`+${data?.new_customers ?? 0} new this month`}
            icon={Users}
        />
        <StatsCard 
            title="Liters Delivered" 
            value={`+${data?.today_liters?.toLocaleString() ?? 0} L`}
            subtext="+19% from last month" // TODO: Real monthly stats
            icon={Milk}
        />
        <StatsCard 
            title="Active Now" 
            value={`+${data?.customer_insights?.active_customers ?? data?.total_customers ?? 0}`} 
            subtext="+201 since last hour" // TODO: Real hourly stats
            icon={Activity}
        />
      </div>

      {/* Charts & Lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card dark:bg-[#111111]/40 border-border dark:border-white/[0.08] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">{t('overview')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={data?.revenue_trend || []} />
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-card dark:bg-[#111111]/40 border-border dark:border-white/[0.08] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">{t('recentActivity')}</CardTitle>
            <div className="text-sm text-muted-foreground dark:text-neutral-400">
              {data?.recent_sales?.length ?? 0} transactions recently.
            </div>
          </CardHeader>
          <CardContent>
            <RecentSales data={data?.recent_sales || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({ title, value, subtext, icon: Icon }: any) {
    return (
        <Card className="bg-card dark:bg-[#111111]/40 border-border dark:border-white/[0.08] backdrop-blur-md hover:bg-accent/50 dark:hover:bg-white/[0.02] transition-colors group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-neutral-400 group-hover:text-foreground dark:group-hover:text-neutral-200 transition-colors">
              {title}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground dark:text-indigo-500/70 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground dark:text-white tracking-tight">{value}</div>
            <p className="text-xs text-muted-foreground dark:text-neutral-500 mt-1 flex items-center gap-1">
               {subtext.includes('+') && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
               <span className={subtext.includes('+') ? "text-emerald-500" : "text-muted-foreground dark:text-neutral-500"}>
                 {subtext}
               </span>
            </p>
          </CardContent>
        </Card>
    )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
      </div>
    </div>
  )
}
