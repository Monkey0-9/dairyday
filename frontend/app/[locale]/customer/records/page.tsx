"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, isSameMonth } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Zap,
  Activity,
  Fingerprint,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"
import { useTranslations } from "next-intl"

import { consumptionApi, authApi, billsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmptyBillState, EmptyState } from "@/components/ui/empty-state"
import { TimelineSkeleton } from "@/components/skeletons"
import { PremiumErrorState } from "@/components/ui/state-displays"
import { Button } from "@/components/ui/button"

interface ConsumptionDay {
  date: string
  quantity?: number | string
  liters?: number | string
}

interface Bill {
  id: string;
  month: string;
  total_amount: number;
  total_liters: number;
  status: "PAID" | "UNPAID";
  pdf_url?: string;
  is_locked?: boolean;
}

export default function MilkRecordsPage() {
  const t = useTranslations("Records")
  const tCommon = useTranslations("Common")
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"consumption" | "billing">("consumption")
  const [mounted, setMounted] = useState(false)
  const monthStr = format(selectedMonth, "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const {
    data: consumption,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["my-consumption", monthStr],
    queryFn: () => consumptionApi.getMine(monthStr).then((res: { data: ConsumptionDay[] }) => res.data),
    enabled: !!userId,
  })

  const {
    data: bills,
    isLoading: isBillsLoading,
    isError: isBillsError,
    refetch: refetchBills
  } = useQuery({
    queryKey: ["my-bills"],
    queryFn: () => billsApi.list().then((r) => r.data),
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

  if (isError || isBillsError) {
    return (
      <div className="container mx-auto px-4 py-20 bg-background min-h-screen">
        <PremiumErrorState
          message={t('loadError') || "Failed to load records"}
          onRetry={() => { refetch(); refetchBills(); }}
        />
      </div>
    )
  }

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
      {/* High-Fidelity Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[180px] rounded-full opacity-40 animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full opacity-30 animate-pulse-glow animation-delay-3000" />
      </div>

      <div className="container max-w-5xl mx-auto px-6 py-12 relative z-10 space-y-16">

        {/* Header Protocol */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 border-b border-border/10 pb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary animate-pulse" />
              <span className="font-micro text-primary tracking-[0.6em] uppercase">{t('consumptionLedger')}</span>
            </div>
            <h1 className="font-big text-foreground italic uppercase">{t('yieldRecords').split(' ')[0]} <span className="text-gradient">{t('yieldRecords').split(' ')[1]}</span></h1>
          </div>

          <div className="flex bg-white/[0.03] border border-white/10 p-1.5 rounded-[2rem] glass-card shadow-glass-elev">
            <button
              onClick={() => setActiveTab("consumption")}
              className={cn(
                "px-10 py-3 rounded-[1.5rem] font-micro text-xs tracking-[0.2em] uppercase transition-all duration-700",
                activeTab === "consumption"
                  ? "bg-primary text-primary-foreground shadow-glow-primary/40"
                  : "text-foreground/40 hover:text-foreground hover:bg-white/5"
              )}
            >
              {t("consumptionTab")}
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={cn(
                "px-10 py-3 rounded-[1.5rem] font-micro text-xs tracking-[0.2em] uppercase transition-all duration-700",
                activeTab === "billing"
                  ? "bg-primary text-primary-foreground shadow-glow-primary/40"
                  : "text-foreground/40 hover:text-foreground hover:bg-white/5"
              )}
            >
              {t("billingTab")}
            </button>
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
              <p className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('volumeAgg')}</p>
              <h2 className="text-7xl font-black font-heading tracking-tighter italic text-foreground leading-none">
                {mounted ? <><CountUp end={totalLiters} decimals={totalLiters % 1 !== 0 ? 2 : 0} duration={1} /> <span className="text-xs font-sans font-normal opacity-20">{t('liters').toUpperCase()[0]}</span></> : `${Number(totalLiters).toFixed(2).replace(/\.00$/, '')} ${t('liters').toUpperCase()[0]}`}
              </h2>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity size={32} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-10 rounded-[2.5rem] glass-card border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('nodeCount')}</p>
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
              <p className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('auditState')}</p>
              <h2 className="text-2xl font-black font-heading tracking-tight italic text-foreground/60 leading-tight uppercase">
                {t('nominalSecure')}
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
            <span className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('ledgerTimeline')}</span>
            <div className="h-[1px] flex-1 bg-foreground/5" />
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {activeTab === "consumption" ? (
                isLoading ? (
                  <TimelineSkeleton count={6} />
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
                                <span className="text-5xl font-black font-heading italic tracking-tighter text-foreground">{Number(qty).toFixed(2).replace(/\.00$/, '')}</span>
                                <span className="font-sans text-xs italic opacity-20 font-normal text-foreground mb-2">{t('liters').toUpperCase()}</span>
                              </div>
                            ) : (
                              <span className="font-micro text-foreground/5 uppercase tracking-[0.5em] italic">{t('nullEvent')}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="py-20">
                    <EmptyState 
                      icon={Zap}
                      title={t('zeroYieldEvent')} 
                      description={t('noUsageDetected')}
                    />
                  </div>
                )
              ) : (
                isBillsLoading ? (
                  <TimelineSkeleton count={4} />
                ) : bills && bills.length > 0 ? (
                  bills.map((bill: Bill, idx: number) => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-8 rounded-[2rem] border glass-card bg-foreground/[0.02] border-border/10 hover:border-primary/40 hover:bg-foreground/[0.04] transition-all duration-700 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-8 text-foreground">
                        <div className={cn(
                          "h-16 w-16 rounded-2xl border flex items-center justify-center transition-all duration-700",
                          bill.status === "PAID" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-primary/10 border-primary/20 text-primary"
                        )}>
                          <Zap size={24} className={cn(bill.status === "PAID" ? "fill-current" : "")} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-heading font-black italic tracking-tighter text-foreground uppercase transition-colors group-hover:text-primary">
                            {format(new Date(bill.month + "-01"), "MMMM yyyy")}
                          </h3>
                          <p className={cn(
                            "font-micro uppercase tracking-[0.4em] mt-1",
                            bill.status === "PAID" ? "text-emerald-500" : "text-primary animate-pulse"
                          )}>
                            {bill.status === "PAID" ? tCommon('status.PAID') : tCommon('status.UNPAID')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-12 text-foreground">
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <span className="text-5xl font-black font-heading italic tracking-tighter text-foreground">₹{Number(bill.total_amount).toFixed(2).replace(/\.00$/, '')}</span>
                            <span className="font-sans text-xs italic opacity-20 font-normal text-foreground mb-2">{bill.total_liters}L</span>
                          </div>
                        </div>
                        {bill.pdf_url && (
                          <a
                            href={bill.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-12 w-12 rounded-full border border-border/5 flex items-center justify-center bg-foreground/[0.05] text-foreground/40 hover:text-primary hover:border-primary/40 transition-all duration-700"
                            title={t('download') || "Download PDF"}
                          >
                            <Download size={20} />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20">
                    <EmptyBillState />
                  </div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global Audit Background Grid */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06] overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-foreground/10" />
          <div className="absolute top-0 left-3/4 w-[1px] h-full bg-foreground/10" />
          <div className="absolute top-1/3 left-0 w-full h-[1px] bg-foreground/10" />
          <div className="absolute top-2/3 left-0 w-full h-[1px] bg-foreground/10" />
        </div>
      </div>
    </div>
  )
}
