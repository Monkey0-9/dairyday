"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import {
  Users,
  Milk,
  AlertCircle,
  ClipboardCheck,
  Receipt,
  ArrowRight,
  IndianRupee,
  BarChart3,
  Activity,
  Database,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

import { analyticsApi, authApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/* ─── Premium Components ─── */

const Scanline = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.5)_50%)] bg-[length:100%_4px] animate-scanline" />
  </div>
)

interface StatCardProps {
  title: string
  value: string | number
  prefix?: string
  suffix?: string
  trend?: string
  icon: React.ReactNode
  loading?: boolean
  color?: "primary" | "emerald" | "amber" | "white"
  index: number
}

const StatCard = ({ title, value, prefix, suffix, trend, icon, loading, color, index }: StatCardProps) => {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    white: "text-white/40 bg-white/5 border-white/10",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.8 }}
      className="glass-card rounded-xl p-3 border-white/5 bg-white/[0.02] hover:border-white/20 transition-all duration-700 flex flex-col justify-between relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-primary/5 transition-all duration-700" />

      <div className="flex items-start justify-between mb-2 relative z-10">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center border transition-all duration-700", colorMap[color as keyof typeof colorMap] || colorMap.white)}>
          {React.cloneElement(icon as React.ReactElement, { size: 14 })}
        </div>
        {trend && (
          <Badge className="bg-white/5 border-white/5 text-white/20 px-2 py-0.5 font-micro text-[7px] uppercase tracking-widest italic group-hover:text-white transition-colors">
            {trend}
          </Badge>
        )}
      </div>

      <div className="space-y-1 relative z-10">
        <p className="font-micro text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-1">
          {title}
        </p>

        {loading ? (
          <Skeleton className="h-6 w-20 bg-white/5 rounded-lg animate-pulse" />
        ) : (
          <h2 className="text-xl font-black font-heading tracking-tighter text-white italic leading-none truncate uppercase">
            {prefix && <span className="text-sm align-top mr-0.5 not-italic opacity-40">{prefix}</span>}
            {value.toLocaleString()}
            {suffix && <span className="text-[10px] align-bottom ml-0.5 not-italic opacity-20">{suffix}</span>}
          </h2>
        )}
      </div>

      <Scanline />
    </motion.div>
  )
}

interface NavProtocolCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  cta: string
  index: number
}

const NavProtocolCard = ({ title, description, icon, href, cta, index }: NavProtocolCardProps) => (
  <Link href={href}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.8 }}
      className="p-4 rounded-xl glass-card border-white/5 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04] transition-all duration-700 group cursor-pointer relative overflow-hidden h-full flex flex-col justify-between"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <div className="space-y-3 relative z-10">
        <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/10 group-hover:text-primary group-hover:border-primary/20 transition-all duration-700">
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-lg font-heading font-black italic tracking-tighter text-white uppercase group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-white/20 font-heading font-bold italic text-[10px] group-hover:text-white/40 transition-colors uppercase leading-tight">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between relative z-10">
        <span className="font-micro text-[7px] text-white/20 uppercase tracking-[0.3em] italic">{cta}</span>
        <div className="h-7 w-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white">
          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      <Scanline />
    </motion.div>
  </Link>
)

export default function AdminDashboardPage() {
  const t = useTranslations("Admin.dashboard")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setUserRole(authApi.getUserRole())
    setMounted(true)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => analyticsApi.getDashboard().then(res => res.data),
    staleTime: 30_000,
  })

  if (!mounted) return null

  const currentDate = new Date()

  return (
    <div className="space-y-6 relative">
      {/* Strategic Command Hero */}
      <section className="relative overflow-hidden rounded-2xl glass-card border-white/5 bg-white/[0.02] p-6 group shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 rounded-full blur-[100px] -mr-32 pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-emerald-500/5 rounded-full blur-[100px] -ml-32 pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-primary font-micro text-[9px] uppercase tracking-[0.4em] italic animate-pulse">
              <div className="h-1 w-1 rounded-full bg-primary shadow-glow-primary" />
              {t('operationalNode')} :: {userRole || 'ADMIN'}
            </div>

            <h1 className="text-3xl lg:text-5xl font-black font-heading italic uppercase leading-none text-white tracking-tighter">
              {t('strategicOversight').split(' ')[0]} <span className="text-gradient">{t('strategicOversight').split(' ').slice(1).join(' ')}</span>
            </h1>

            <p className="text-white/40 font-heading font-medium italic text-sm tracking-tight max-w-xl leading-relaxed">
              {t('oversightDescription')}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-1 text-right">
            <span className="font-micro text-[8px] uppercase tracking-[0.4em] text-white/20 italic">{t('globalTime')}</span>
            <h2 className="text-xl text-white font-black font-heading italic uppercase tracking-tighter">
              {mounted ? format(currentDate, "HH:mm") : "--:--"} <span className="text-[9px] font-sans opacity-20 font-normal">UTC</span>
            </h2>
            <p className="font-heading font-bold italic text-white/40 text-xs uppercase tracking-tighter">{mounted ? format(currentDate, "MMM dd, yyyy") : "----------"}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center gap-8 text-white/20 font-micro text-[8px] uppercase tracking-[0.3em] italic relative z-10">
          <div className="flex items-center gap-2">
            <Database size={10} className="text-primary" />
            {t('secureDbSync')}
          </div>
          <div className="flex items-center gap-2">
            <Activity size={10} className="text-emerald-500" />
            {t('engineNominal')}
          </div>
        </div>
        <Scanline />
      </section>

      {/* Aggregate Vitals (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          index={0}
          title={t('stats.activeBase')}
          value={stats?.total_customers || 0}
          icon={<Users size={18} />}
          loading={isLoading}
          color="primary"
          trend="+1.2%"
        />
        <StatCard
          index={1}
          title={t('stats.dailyProduction')}
          value={stats?.today_liters || 0}
          suffix="L"
          icon={<Milk size={18} />}
          loading={isLoading}
          color="emerald"
        />
        <StatCard
          index={2}
          title={t('stats.yieldRevenue')}
          value={stats?.monthly_revenue || 0}
          prefix="₹"
          icon={<IndianRupee size={18} />}
          loading={isLoading}
          color="white"
          trend="+8.4%"
        />
        <StatCard
          index={3}
          title={t('stats.settlementGap')}
          value={stats?.pending_bills || 0}
          icon={<AlertCircle size={18} />}
          loading={isLoading}
          color="amber"
          trend={`₹${stats?.unpaid_amount || 0}`}
        />
      </div>

      {/* Strategic Rail (Quick Actions) */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-6 py-2 bg-white/[0.02] rounded-xl border border-white/5">
          <span className="font-micro text-[9px] text-white/20 uppercase tracking-[0.3em] italic">{t('strategicOperations')}</span>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NavProtocolCard
            index={0}
            title={t('actions.dailyEntry.title')}
            description={t('actions.dailyEntry.desc')}
            icon={<ClipboardCheck size={24} />}
            href="/admin/daily-entry"
            cta={t('actions.dailyEntry.launchCta')}
          />
          <NavProtocolCard
            index={1}
            title={t('actions.finance.title')}
            description={t('actions.finance.desc')}
            icon={<Receipt size={24} />}
            href="/admin/bills"
            cta={t('actions.finance.initiateCta')}
          />
          <NavProtocolCard
            index={2}
            title={t('actions.market.title')}
            description={t('actions.market.desc')}
            icon={<BarChart3 size={24} />}
            href="/admin/consumption"
            cta={t('actions.market.viewCta')}
          />
        </div>
      </div>
    </div>
  )
}
