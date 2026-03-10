"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslations, useLocale } from "next-intl"
import { format, subMonths, addMonths } from "date-fns"
import { formatCurrency, getDateFnsLocale } from "@/lib/i18n-utils"
import { consumptionApi, billsApi, usersApi } from "@/lib/api"
import { motion } from "framer-motion"
import {
  Milk, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Clock, BarChart3, FileText, CalendarDays
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ConsumptionRecord {
  id?: string
  date: string
  quantity: number
  extra_qty?: number
  status: string
}

interface Bill {
  id: string
  month: string
  total_liters: number
  amount: number
  status: string
}

export default function RecordsPage() {
  const t = useTranslations("Records")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const monthStr = format(selectedMonth, "yyyy-MM")

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => usersApi.getMe().then(r => r.data) })
  const { data: consumption = [], isLoading: loadingC } = useQuery<ConsumptionRecord[]>({
    queryKey: ["consumption-mine", monthStr],
    queryFn: async () => {
      const res = await consumptionApi.getMine(monthStr)
      const d = res.data
      return Array.isArray(d) ? d : (d.records || d.items || d.data || [])
    },
    staleTime: 60_000,
  })
  const { data: bills = [], isLoading: loadingB } = useQuery<Bill[]>({
    queryKey: ["my-bills"],
    queryFn: async () => {
      const res = await billsApi.list()
      const d = res.data
      return Array.isArray(d) ? d : (d.bills || d.items || d.data || [])
    },
    staleTime: 120_000,
  })

  const totalLiters = consumption.reduce((s, c) => s + Number(c.quantity || 0) + Number(c.extra_qty || 0), 0)
  const delivered = consumption.filter(c => c.status === "DELIVERED" || c.quantity > 0).length

  const statusStyle: Record<string, string> = {
    DELIVERED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    SKIPPED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <header className="border-b border-white/[0.03] pb-4 flex items-end justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.05] bg-white/[0.02] mb-2">
            <Milk className="h-1.5 w-1.5 text-primary" />
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary italic">YIELD_RECORDS</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black font-heading tracking-tight text-white italic uppercase">
            <span className="opacity-10 block">My</span>
            <span className="text-gradient -mt-1 block italic lowercase">{t("title")}</span>
          </h1>
          {me && <p className="text-[10px] font-bold text-white/30 font-mono uppercase tracking-widest mt-1">{me.name} — {me.email}</p>}
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-obsidian-700/40 border border-white/5 rounded-lg backdrop-blur-3xl">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))} aria-label={tCommon("accessibility.previousMonth")}>
            <ChevronLeft size={12} />
          </Button>
          <div className="px-3 py-0.5 min-w-[110px] text-center text-[10px] font-black uppercase tracking-widest text-white italic">
            {format(selectedMonth, "MMM yyyy", { locale: dateFnsLocale })}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} aria-label={tCommon("accessibility.nextMonth")}>
            <ChevronRight size={12} />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("volumeAgg"), value: loadingC ? null : `${totalLiters.toFixed(1)}L`, icon: <Milk size={14} /> },
          { label: t("nodeCount"), value: loadingC ? null : delivered, icon: <CalendarDays size={14} /> },
          { label: t("auditState"), value: loadingC ? null : t("nominalSecure"), icon: <CheckCircle2 size={14} /> },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-3 bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-white/30 mb-2">{s.icon}<span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span></div>
            {s.value === null ? <Skeleton className="h-5 w-14 bg-white/5" /> : <p className="text-base font-black text-white italic truncate">{s.value}</p>}
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="consumption" className="space-y-4">
        <TabsList className="bg-white/[0.02] border border-white/5 rounded-xl p-1 h-auto gap-1">
          <TabsTrigger value="consumption" className="rounded-lg text-[9px] font-black uppercase tracking-widest px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <BarChart3 size={10} className="mr-1" />{t("consumptionTab")}
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg text-[9px] font-black uppercase tracking-widest px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <FileText size={10} className="mr-1" />{t("billingTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumption">
          {loadingC ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5 rounded-xl" />)}</div>
          ) : consumption.length === 0 ? (
            <div className="py-16 text-center">
              <Milk className="mx-auto h-10 w-10 text-white/10 mb-3" />
              <p className="font-black italic text-white/20 uppercase tracking-widest text-sm">{t("zeroYieldEvent")}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.03] bg-obsidian-800/40 backdrop-blur-3xl overflow-hidden">
              {consumption.map((c, i) => {
                const status = c.status || (c.quantity > 0 ? "DELIVERED" : "SKIPPED")
                return (
                  <motion.div key={c.date || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-all">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center border",
                        status === "DELIVERED" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10")}>
                        {status === "DELIVERED" ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-white/30" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-black italic text-white uppercase tracking-tight">
                          {c.date ? format(new Date(c.date), "EEE, d MMM", { locale: dateFnsLocale }) : "—"}
                        </p>
                        {c.extra_qty && c.extra_qty > 0 && (
                          <p className="text-[9px] font-bold text-primary/60">+{Number(c.extra_qty).toFixed(1)}L extra</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black italic text-white">{Number(c.quantity || 0).toFixed(1)}<span className="text-[8px] text-white/30 ml-0.5">L</span></span>
                      <Badge className={cn("text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg border", statusStyle[status] || "bg-white/5 text-white/30 border-white/10")}>
                        {status}
                      </Badge>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {loadingB ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-xl" />)}</div>
          ) : bills.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-white/10 mb-3" />
              <p className="font-black italic text-white/20 uppercase tracking-widest text-sm">{t("zeroLedgerEvent")}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.03] bg-obsidian-800/40 backdrop-blur-3xl overflow-hidden">
              {bills.map((bill, i) => (
                <motion.div key={bill.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border",
                      bill.status === "PAID" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20")}>
                      {bill.status === "PAID" ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Clock size={14} className="text-amber-400" />}
                    </div>
                    <div>
                      <p className="text-[12px] font-black italic text-white uppercase">{bill.month}</p>
                      <p className="text-[9px] font-bold text-white/30 font-mono">{Number(bill.total_liters || 0).toFixed(1)}L delivered</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-black italic text-gradient">₹{formatCurrency(Number(bill.amount), locale)}</p>
                    <Badge className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                      bill.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                      {bill.status === "PAID" ? t("settlementComplete") : t("awaitSettlement")}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
