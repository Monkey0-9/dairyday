"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, isSameMonth } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Droplets,
  Activity,
  Calendar,
  Zap,
  Fingerprint,
  TrendingDown,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"
import { useTranslations } from "next-intl"

import { consumptionApi, authApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ConsumptionDay {
  date: string
  quantity?: number | string
  liters?: number | string
}

export default function MilkRecordsPage() {
  const t = useTranslations("Records")
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const monthStr = format(selectedMonth, "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const { data: consumption, isLoading } = useQuery({
    queryKey: ["my-consumption", monthStr],
    queryFn: () => consumptionApi.getMine(monthStr).then((r) => r.data),
    enabled: !!userId,
  })

  const totalLiters = useMemo(
    () =>
      consumption?.reduce(
        (s: number, d: ConsumptionDay) => s + Number(d.quantity ?? d.liters ?? 0),
        0
      ) ?? 0,
    [consumption]
  )

  const sortedRecords = useMemo(
    () =>
      consumption
        ? [...consumption].sort(
          (a: ConsumptionDay, b: ConsumptionDay) => b.date.localeCompare(a.date)
        )
        : [],
    [consumption]
  )

  const handlePrev = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d })
  const handleNext = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d })

  const handleExport = async () => {
    try {
      const res = await consumptionApi.export(monthStr)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `milk_records_${monthStr}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      console.error("Export failed", e)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/40 relative">
      <div className="container max-w-5xl mx-auto px-6 py-12 relative z-10 space-y-16">

        {/* Header Protocol */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 border-b border-border/10 pb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary animate-pulse" />
              <span className="font-micro text-primary tracking-[0.6em] uppercase">CONSUMPTION_LEDGER_v4.2</span>
            </div>
            <h1 className="font-big text-foreground italic uppercase">Yield <span className="text-gradient">Records</span></h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-2 p-2 bg-foreground/[0.02] border border-border/10 rounded-[2rem] glass-card">
              <button onClick={handlePrev} className="p-3 rounded-xl text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all" aria-label="Previous Month">
                <ChevronLeft size={24} />
              </button>
              <div className="px-10 py-2 min-w-[200px] text-center">
                <span className="text-xl font-heading font-black uppercase tracking-tighter text-foreground italic">
                  {mounted ? format(selectedMonth, "MMMM yyyy") : "----------"}
                </span>
              </div>
              <button onClick={handleNext} disabled={isSameMonth(selectedMonth, new Date())} className="p-3 rounded-xl text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all disabled:opacity-5" aria-label="Next Month">
                <ChevronRight size={24} />
              </button>
            </div>
            <Button
              onClick={handleExport}
              className="h-16 px-10 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-white font-heading font-black italic text-lg tracking-tight transition-all duration-700 shadow-glow-primary/10 gap-3"
            >
              <Download size={20} />
              {t('export').toUpperCase()}
            </Button>
          </div>
        </header>

        {/* Aggregate Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-10 rounded-[2.5rem] glass-card border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-micro text-foreground/20 uppercase tracking-[0.4em]">Volume_Agg</p>
              <h2 className="text-7xl font-black font-heading tracking-tighter italic text-foreground leading-none">
                {mounted ? <><CountUp end={totalLiters} decimals={1} duration={1} /> <span className="text-xs font-sans font-normal opacity-20">L</span></> : `${totalLiters.toFixed(1)} L`}
              </h2>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity size={32} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-10 rounded-[2.5rem] glass-card border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-micro text-foreground/20 uppercase tracking-[0.4em]">Node_Count</p>
              <h2 className="text-7xl font-black font-heading tracking-tighter italic text-foreground leading-none">
                {consumption?.length || 0}
              </h2>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar size={32} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-10 rounded-[2.5rem] glass-card border-border/5 bg-foreground/[0.02] flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-micro text-foreground/20 uppercase tracking-[0.4em]">Audit_State</p>
              <h2 className="text-2xl font-black font-heading tracking-tight italic text-foreground/60 leading-tight uppercase">
                NOMINAL_SECURE
              </h2>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-foreground/[0.05] border border-border/10 flex items-center justify-center text-foreground/20">
              <Fingerprint size={32} />
            </div>
          </motion.div>
        </div>

        {/* Historical Timeline */}
        <div className="space-y-8">
          <div className="flex items-center gap-6 px-10 py-4 bg-foreground/[0.02] rounded-2xl border border-border/5">
            <span className="font-micro text-foreground/20 uppercase tracking-[0.4em]">Ledger_Timeline</span>
            <div className="h-[1px] flex-1 bg-foreground/5" />
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-24 w-full rounded-[2rem] bg-foreground/[0.01] border border-border/5 animate-pulse" />
                ))
              ) : sortedRecords.length > 0 ? (
                sortedRecords.map((day: ConsumptionDay, idx: number) => {
                  const qty = Number(day.quantity ?? day.liters ?? 0)
                  return (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "p-8 rounded-[2rem] border transition-all duration-700 flex items-center justify-between group",
                        qty > 0
                          ? "glass-card bg-foreground/[0.02] border-border/10 hover:border-primary/40 hover:bg-foreground/[0.04]"
                          : "opacity-40 border-border/5 bg-transparent"
                      )}
                    >
                      <div className="flex items-center gap-8 text-foreground">
                        <div className={cn(
                          "h-16 w-16 rounded-2xl border flex items-center justify-center transition-all duration-700",
                          qty > 0 ? "bg-primary/10 border-primary/20 text-primary group-hover:scale-110" : "bg-foreground/5 border-border/5 text-foreground/5"
                        )}>
                          <Zap size={24} className={cn(qty > 0 ? "fill-current" : "")} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-heading font-black italic tracking-tighter text-foreground uppercase transition-colors group-hover:text-primary">
                            {format(new Date(day.date), "dd MMMM")}
                          </h3>
                          <p className="font-micro text-foreground/20 uppercase tracking-[0.4em] mt-1">{format(new Date(day.date), "EEEE")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-12 text-foreground">
                        <div className="text-right">
                          {qty > 0 ? (
                            <div className="flex items-center gap-4">
                              <span className="text-5xl font-black font-heading italic tracking-tighter text-foreground">{qty.toFixed(1)}</span>
                              <span className="font-sans text-xs italic opacity-20 font-normal text-foreground mb-2">LITERS</span>
                            </div>
                          ) : (
                            <span className="font-micro text-foreground/5 uppercase tracking-[0.5em] italic">NULL_EVENT</span>
                          )}
                        </div>
                        <div className={cn(
                          "h-12 w-12 rounded-full border flex items-center justify-center transition-all duration-700",
                          qty > 0 ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 group-hover:shadow-glow-emerald/10" : "border-border/5 text-foreground/5"
                        )}>
                          {qty > 0 ? <Droplets size={20} /> : <TrendingDown size={20} />}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center space-y-8 opacity-10">
                  <Activity className="w-32 h-32 stroke-[1] text-foreground" />
                  <p className="font-heading font-black italic text-4xl tracking-[0.5em] uppercase text-foreground">ZERO_YIELD_EVENT</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global Audit Background Grid */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05] overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-foreground" />
          <div className="absolute top-0 left-3/4 w-[1px] h-full bg-foreground" />
          <div className="absolute top-1/3 left-0 w-full h-[1px] bg-foreground" />
          <div className="absolute top-2/3 left-0 w-full h-[1px] bg-foreground" />
        </div>
      </div>
    </div>
  )
}
