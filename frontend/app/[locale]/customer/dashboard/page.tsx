"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, isSameMonth } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Droplets,
  Calendar,
  TrendingUp,
  CheckCircle2,

  ArrowRight,
  Wallet,
  Zap,
  Activity,
  Fingerprint,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"
import Link from "next/link"

import { useTranslations } from "next-intl"
import { consumptionApi, billsApi, authApi, paymentsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ─── Premium Components ─── */

const MetricCard = ({ icon, label, value, subtext, color, delay = 0, className }: { icon: React.ReactNode; label: string; value: React.ReactNode; subtext?: string; color: "primary" | "amber" | "emerald" | "neutral"; delay?: number; className?: string }) => {
  const colors = {
    primary: "text-primary border-primary/20 bg-primary/5",
    amber: "text-yellow-600 dark:text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    emerald: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    neutral: "text-foreground/20 border-border/5 bg-foreground/[0.02]",
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      className={cn(
        "p-4 rounded-[1.5rem] glass-card flex flex-col justify-between group hover:border-primary/30 transition-all duration-700 relative overflow-hidden",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-50 pointer-events-none" />
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-2 rounded-lg border transition-all duration-700 group-hover:scale-110 shadow-glass-elev", colors[color as keyof typeof colors])}>
          {icon}
        </div>
        <div className="text-right">
          <p className="font-micro tracking-[0.3em] text-foreground/20 uppercase italic text-[8px]">{label}</p>
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-heading tracking-tighter italic text-foreground group-hover:text-primary transition-colors duration-700 leading-none">{value}</span>
        </div>
        {subtext && <p className="font-micro text-foreground/10 mt-1 uppercase tracking-[0.1em] italic text-[7px]">{subtext}</p>}
      </div>
    </motion.div>
  )
}

export default function CustomerOverview() {
  const t = useTranslations("Dashboard")
  const commonT = useTranslations("Common")
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const monthStr = useMemo(() =>
    selectedMonth ? format(selectedMonth, "yyyy-MM") : format(new Date(), "yyyy-MM"),
    [selectedMonth]
  )

  useEffect(() => {
    setUserId(authApi.getUserId())
    setSelectedMonth(new Date())
    setMounted(false)
    setTimeout(() => setMounted(true), 100) // Trigger countup
  }, [])

  const { data: consumption } = useQuery({
    queryKey: ["my-consumption", monthStr],
    queryFn: () => consumptionApi.getMine(monthStr).then((r) => r.data),
    enabled: !!userId,
  })

  const { data: bill, isLoading: isBillLoading } = useQuery({
    queryKey: ["my-bill", monthStr],
    queryFn: () => billsApi.get(userId!, monthStr).then((r) => r.data),
    enabled: !!userId,
  })

  const totalLiters = useMemo(
    () =>
      consumption?.reduce(
        (s: number, d: { quantity?: number; liters?: number }) => s + Number(d.quantity ?? d.liters ?? 0),
        0
      ) ?? 0,
    [consumption]
  )

  const streak = useMemo(() => {
    if (!consumption?.length) return 0
    const sorted = [...consumption].sort(
      (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date)
    )
    let count = 0
    for (const d of sorted) {
      if (Number(d.quantity ?? d.liters ?? 0) > 0) count++
      else break
    }
    return count
  }, [consumption])

  const avgDaily = useMemo(() => {
    const active = consumption?.filter((d: { quantity?: number; liters?: number }) => Number(d.quantity ?? d.liters ?? 0) > 0).length || 0
    return active > 0 ? totalLiters / active : 0
  }, [consumption, totalLiters])

  const billAmount = Number(bill?.total_amount ?? bill?.amount ?? 0)
  const isPaid = bill?.status === "PAID" || bill?.status === "paid"

  const handlePrev = () =>
    setSelectedMonth((p) => { const d = new Date(p!); d.setMonth(d.getMonth() - 1); return d })
  const handleNext = () =>
    setSelectedMonth((p) => { const d = new Date(p!); d.setMonth(d.getMonth() + 1); return d })

  const handlePayment = async () => {
    if (!bill?.id) return
    try {
      const res = await paymentsApi.createOrder(bill.id)
      window.location.href = res.data?.payment_url || "/customer/payment"
    } catch { /* interceptor handles error toast */ }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/40 relative">
      <div className="container mx-auto px-4 py-6 relative z-10 space-y-8">
        {/* Header Protocol */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-border/10 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 rounded-full bg-primary shadow-glow-primary animate-pulse" />
              <span className="font-micro text-primary tracking-[0.4em] uppercase text-[10px]">VITAL_STREAM_v4.2</span>
            </div>
            <h1 className="font-big text-foreground italic uppercase">Vital <span className="text-gradient">Overview</span></h1>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-foreground/[0.02] border border-border/10 rounded-xl glass-card">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-6 py-1 min-w-[150px] text-center">
              <span className="text-lg font-heading font-black uppercase tracking-tighter text-foreground italic">
                {selectedMonth ? format(selectedMonth, "MMMM yyyy") : "LOAD_..."}
              </span>
            </div>
            <button
              onClick={handleNext}
              disabled={!selectedMonth || isSameMonth(selectedMonth, new Date())}
              className="p-2 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all disabled:opacity-5 active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        {/* Global Hub Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Main Reconciliation Node */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-8 p-6 rounded-[1.5rem] glass-card flex flex-col justify-between group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-50" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="font-micro tracking-[0.3em] text-foreground/20 uppercase italic text-[8px]">
                  Current_Settle_Due
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-primary font-heading mt-2 italic">₹</span>
                  <h2 className="text-5xl lg:text-7xl font-black font-heading tracking-tight leading-none text-foreground italic">
                    {mounted ? (
                      <CountUp end={billAmount} duration={2} separator="," />
                    ) : (
                      billAmount.toLocaleString()
                    )}
                  </h2>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 h-full justify-between">
                <AnimatePresence mode="wait">
                  {isPaid ? (
                    <motion.div
                      key="p" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full font-micro tracking-[0.3em] italic text-[8px] shadow-glow-emerald/5"
                    >
                      <CheckCircle2 size={12} /> STATUS_NOMINAL
                    </motion.div>
                  ) : (
                    <motion.div
                      key="u" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full font-micro tracking-[0.3em] italic text-[8px] shadow-glow-primary/5 animate-pulse"
                    >
                      <Activity size={12} /> AWAIT_SETTLE
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-right">
                  <p className="font-micro text-foreground/10 uppercase tracking-[0.3em] italic text-[8px]">RECON_ID</p>
                  <p className="text-xl font-black italic text-foreground/40 uppercase tracking-tighter font-heading">
                    {selectedMonth ? format(selectedMonth, "MMM_yyyy") : "--"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-6 relative z-10">
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-foreground/[0.03] border border-border/10 rounded-xl shadow-glass-elev">
                    <Droplets className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="font-micro text-foreground/20 uppercase mb-0.5 text-[8px]">{t('volume')}</p>
                    <p className="text-2xl font-black font-heading italic tracking-tighter">{totalLiters.toFixed(1)} <span className="font-sans text-[8px] italic opacity-20 font-normal">LITERS</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-foreground/[0.03] border border-border/10 rounded-xl shadow-glass-elev">
                    <Zap className="text-yellow-600 dark:text-yellow-400" size={20} />
                  </div>
                  <div>
                    <p className="font-micro text-foreground/20 uppercase mb-0.5 text-[8px]">{t('continuity')}</p>
                    <p className="text-2xl font-black font-heading italic tracking-tighter">{streak} <span className="font-sans text-[8px] italic opacity-20 font-normal">NODES</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePayment}
                  disabled={!bill || isPaid || isBillLoading}
                  className="h-14 flex-1 rounded-xl bg-foreground text-background hover:bg-primary hover:text-white font-heading font-black tracking-tighter italic text-xl gap-3 transition-all duration-700 disabled:opacity-10 group shadow-2xl"
                >
                  {isPaid ? "SETTLEMENT_FINALIZED" : "EXECUTE_SETTLEMENT"}
                  {!isPaid && <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-all duration-1000" />}
                </Button>

                {!isPaid && (
                  <div className="hidden md:flex flex-col items-center justify-center h-14 w-16 glass-card border-border/10 rounded-xl italic shadow-glass-elev">
                    <Fingerprint className="text-foreground/20 mb-0.5" size={18} />
                    <span className="font-micro text-[6px] text-foreground/10 tracking-[0.4em]">AUTH_L3</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Tactical Analytics Rails */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-10">
            <MetricCard icon={<TrendingUp size={28} />} label="Efficiency Mean" value={`${avgDaily.toFixed(1)} L`} subtext="DAILY_YIELD_AVG" color="emerald" delay={0.1} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="p-8 rounded-[2rem] glass-card flex flex-col justify-between group overflow-hidden relative shadow-glow-amber/5"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-150 transition-all duration-1000" />

              <div className="flex justify-between items-start relative z-10">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-600 dark:text-yellow-400">
                  <Flame size={24} />
                </div>
                <div className="text-right">
                  <p className="font-micro text-foreground/20 uppercase italic tracking-[0.3em] text-[10px]">{t('deliveryStreak')}</p>
                </div>
              </div>

              <div className="mt-6 relative z-10 flex items-end justify-between">
                <span className="text-7xl lg:text-[7rem] font-black font-heading tracking-tighter italic text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors duration-1000 leading-none">{streak}</span>
                <div className="flex gap-2 pb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: i <= (streak % 5 || 5) ? 30 : 8 }}
                      className={cn(
                        "w-2 rounded-full transition-all duration-1000",
                        i <= (streak % 5 || 5) ? "bg-yellow-600 dark:bg-yellow-400 shadow-glow-amber/40" : "bg-foreground/5"
                      )}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Operational Grid Nodes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/customer/calendar", icon: <Calendar size={20} />, label: commonT('calendar'), border: "border-primary/20", hover: "hover:bg-primary/5 hover:border-primary/40", text: "text-primary" },
            { href: "/customer/records", icon: <Wallet size={20} />, label: "Records", border: "border-emerald-500/20", hover: "hover:bg-emerald-500/5 hover:border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400" },
            { href: "/customer/profile", icon: <Fingerprint size={20} />, label: "Security", border: "border-border/10", hover: "hover:bg-foreground/5 hover:border-border/30", text: "text-foreground/40" },
            { href: "/customer/support", icon: <Activity size={20} />, label: "Health", border: "border-border/10", hover: "hover:bg-foreground/5 hover:border-border/30", text: "text-foreground/40" }
          ].map((node, i) => (
            <motion.div
              key={node.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Link href={node.href} className="block group">
                <div className={cn(
                  "h-24 p-4 rounded-[1.5rem] glass-card border flex flex-col items-center justify-center gap-2 transition-all duration-700 shadow-glass-elev",
                  node.border, node.hover
                )}>
                  <div className={cn("transition-all duration-700 group-hover:scale-110 group-hover:-translate-y-0.5", node.text)}>
                    {node.icon}
                  </div>
                  <span className="font-micro text-[8px] text-foreground/20 group-hover:text-foreground transition-colors duration-700 uppercase tracking-[0.3em]">{node.label}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-foreground" />
        <div className="absolute top-0 left-3/4 w-[1px] h-full bg-foreground" />
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-foreground" />
        <div className="absolute top-3/4 left-0 w-full h-[1px] bg-foreground" />
      </div>
    </div>
  )
}


