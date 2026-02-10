"use client"

import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Users,
  Milk,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ClipboardCheck,
  Receipt,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  IndianRupee,
  BarChart3,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { analyticsApi, authApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AdminDashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    setUserRole(authApi.getUserRole())
  }, [])

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => analyticsApi.getDashboard().then(res => res.data),
    staleTime: 30_000,
  })

  const currentDate = new Date()
  const greeting = currentDate.getHours() < 12 ? "Good morning" : currentDate.getHours() < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
            <Calendar className="h-4 w-4" />
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {greeting}! 👋
          </h1>
          <p className="text-white/80 text-lg max-w-lg">
            Here's your business overview for {format(currentDate, "MMMM yyyy")}.
            {stats?.pending_bills ? ` You have ${stats.pending_bills} pending collections.` : ""}
          </p>
        </div>
      </div>

      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Failed to load live data. Displaying cached results if available.</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Active Customers"
          value={stats?.total_customers || 0}
          trend={(stats?.total_customers || 0) > 0 ? "+2" : null}
          trendLabel="this week"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Today's Intake"
          value={stats?.today_liters || 0}
          suffix=" L"
          trend={(stats?.today_liters || 0) > 0 ? "On track" : null}
          trendLabel="85% of target"
          icon={<Milk className="h-5 w-5" />}
          loading={isLoading}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard
          title="Monthly Revenue"
          value={stats?.monthly_revenue || 0}
          prefix="₹ "
          trend={stats?.monthly_growth || 0}
          trendLabel="vs last month"
          icon={<IndianRupee className="h-5 w-5" />}
          loading={isLoading}
          gradient="from-emerald-500 to-green-500"
          isCurrency
        />
        <StatCard
          title="Pending Bills"
          value={stats?.pending_bills || 0}
          trend={(stats?.pending_bills || 0) > 0 ? `₹${stats?.unpaid_amount?.toLocaleString() || 0}` : null}
          trendLabel="to collect"
          icon={<AlertCircle className="h-5 w-5" />}
          loading={isLoading}
          gradient="from-amber-500 to-orange-500"
          variant="warning"
          isCurrencyTrend={true}
        />
        <StatCard
          title="New Customers"
          value={stats?.new_customers || 0}
          trend={null}
          trendLabel="this month"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
          gradient="from-indigo-500 to-blue-500"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Quick Actions</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(userRole === 'ADMIN') && (
            <QuickActionCard
              title="Daily Entry"
              description="Record today's milk delivery for all customers"
              icon={<ClipboardCheck className="h-7 w-7" />}
              href="/admin/daily-entry"
              cta="Open Entry"
              gradient="from-blue-500/10 to-cyan-500/10"
              iconColor="text-blue-500"
            />
          )}
          <QuickActionCard
            title="Billing & Payments"
            description="Generate bills and record cash payments"
            icon={<Receipt className="h-7 w-7" />}
            href="/admin/bills"
            cta="Manage"
            gradient="from-emerald-500/10 to-green-500/10"
            iconColor="text-emerald-500"
          />
          <QuickActionCard
            title="Consumption Grid"
            description="View monthly consumption data for all customers"
            icon={<BarChart3 className="h-7 w-7" />}
            href="/admin/consumption"
            cta="View Grid"
            gradient="from-violet-500/10 to-purple-500/10"
            iconColor="text-violet-500"
          />
        </div>
      </div>

      {/* Period Info */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
          <BarChart3 className="h-3 w-3" />
          Data period: {stats?.period || format(currentDate, "MMMM yyyy")}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | undefined
  prefix?: string
  suffix?: string
  trend?: string | number | null
  trendLabel?: string
  icon: React.ReactNode
  loading: boolean
  gradient: string
  variant?: "default" | "warning"
  isCurrency?: boolean
  isCurrencyTrend?: boolean
}

function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  trend,
  trendLabel,
  icon,
  loading,
  gradient,
  variant = "default",
  isCurrency = false,
  isCurrencyTrend = false
}: StatCardProps) {
  const isPositiveTrend = typeof trend === 'number' ? trend > 0 : typeof trend === 'string' && trend.startsWith('+')

  return (
    <Card className="relative overflow-hidden border border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 bg-slate-800/80 backdrop-blur-sm min-h-[140px] flex flex-col">
      <CardContent className="p-5 relative flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "p-2 rounded-lg bg-gradient-to-br shadow-md",
            gradient
          )}>
            <div className="text-white">{icon}</div>
          </div>
          {trend !== null && trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
              variant === "warning"
                ? "bg-amber-500/20 text-amber-400"
                : isPositiveTrend
                  ? "bg-green-500/20 text-green-400"
                  : "bg-slate-600/50 text-slate-300"
            )}>
              {!isCurrencyTrend && typeof trend === 'number' && trend > 0 && <ArrowUpRight className="h-2.5 w-2.5" />}
              {!isCurrencyTrend && typeof trend === 'number' && trend < 0 && <ArrowDownRight className="h-2.5 w-2.5" />}
              {typeof trend === 'number' ? `${trend > 0 ? '+' : ''}${trend}%` : trend}
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>

          {loading ? (
            <Skeleton className="h-8 w-20 rounded bg-slate-700" />
          ) : (
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1">
              {prefix && <span className="text-xl text-slate-300">{prefix}</span>}
              <span className="tabular-nums">{(value || 0).toLocaleString()}</span>
              {suffix && <span className="text-sm font-medium text-slate-400 ml-0.5">{suffix}</span>}
            </h2>
          )}
        </div>

        {trendLabel && (
          <p className="text-[9px] font-medium text-slate-500 uppercase mt-1.5">
            {trendLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  cta: string
  gradient: string
  iconColor: string
}

function QuickActionCard({ title, description, icon, href, cta, gradient, iconColor }: QuickActionCardProps) {
  return (
    <Link href={href} className="group block">
      <Card className="border border-slate-700/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2.5 rounded-lg shrink-0",
              gradient
            )}>
              <div className="text-white">{icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-white mb-0.5 group-hover:text-cyan-400 transition-colors truncate">
                {title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2">
                {description}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-cyan-400 font-semibold text-sm">{cta}</span>
            <ArrowRight className="h-4 w-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
