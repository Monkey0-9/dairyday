"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations, useLocale } from "next-intl"
import { format, subMonths, addMonths } from "date-fns"
import { formatCurrency, getDateFnsLocale } from "@/lib/i18n-utils"
import { adminApi, paymentsApi } from "@/lib/api"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  CreditCard, Search, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, Loader2, IndianRupee, TrendingUp, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface PaymentRecord {
  id: string
  user_name?: string
  user_email?: string
  month: string
  total_liters: number
  amount: number
  status: string
  payment_method?: string
  utr_reference?: string
  paid_at?: string
}

export default function PaymentsPage() {
  const t = useTranslations("Admin.payments")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const queryClient = useQueryClient()

  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "PAID" | "UNPAID">("all")
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const monthStr = format(selectedMonth, "yyyy-MM")

  const { data: records = [], isLoading } = useQuery<PaymentRecord[]>({
    queryKey: ["admin-payments", monthStr],
    queryFn: async () => {
      const res = await adminApi.getPaymentsDashboard(monthStr)
      const d = res.data
      return Array.isArray(d) ? d : (d.bills || d.items || d.records || d.data || [])
    },
    staleTime: 30_000,
  })

  const verifyMutation = useMutation({
    mutationFn: (billId: string) => paymentsApi.markPaid(billId, "UPI"),
    onSuccess: () => {
      toast.success(t("authSuccess"))
      setVerifyingId(null)
      queryClient.invalidateQueries({ queryKey: ["admin-payments", monthStr] })
    },
    onError: (err) => { toast.error(formatApiError(err)); setVerifyingId(null) },
  })

  const filtered = useMemo(() =>
    records.filter((r) => {
      const matchSearch = !searchQuery || r.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchFilter = filter === "all" || r.status === filter
      return matchSearch && matchFilter
    }), [records, searchQuery, filter])

  const stats = useMemo(() => {
    const paid = records.filter(r => r.status === "PAID").reduce((s, r) => s + Number(r.amount || 0), 0)
    const outstanding = records.filter(r => r.status !== "PAID").reduce((s, r) => s + Number(r.amount || 0), 0)
    const total = records.reduce((s, r) => s + Number(r.amount || 0), 0)
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0
    return { paid, outstanding, total, rate }
  }, [records])

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-white/[0.03] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.05] bg-white/[0.02] mb-2">
            <ShieldCheck className="h-1.5 w-1.5 text-primary" />
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary italic">PAYMENT_VAULT</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black font-heading tracking-tight text-white italic uppercase">
            <span className="opacity-10 block">Payment</span>
            <span className="text-gradient -mt-1 block italic lowercase">vault</span>
          </h1>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-obsidian-700/40 border border-white/5 rounded-lg backdrop-blur-3xl">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))} aria-label={tCommon("accessibility.previousMonth")}>
            <ChevronLeft size={12} />
          </Button>
          <div className="px-3 py-0.5 min-w-[120px] text-center text-[10px] font-black uppercase tracking-widest text-white italic">
            {format(selectedMonth, "MMM yyyy", { locale: dateFnsLocale })}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} aria-label={tCommon("accessibility.nextMonth")}>
            <ChevronRight size={12} />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("realizedGrowth"), value: isLoading ? null : `₹${formatCurrency(stats.paid, locale)}`, icon: <CheckCircle2 size={14} />, color: "from-emerald-600/20" },
          { label: t("outstandingRisk"), value: isLoading ? null : `₹${formatCurrency(stats.outstanding, locale)}`, icon: <Clock size={14} />, color: "from-rose-600/20" },
          { label: t("totalExposure"), value: isLoading ? null : `₹${formatCurrency(stats.total, locale)}`, icon: <IndianRupee size={14} />, color: "from-blue-600/20" },
          { label: t("efficiencyIndex"), value: isLoading ? null : `${stats.rate}%`, icon: <TrendingUp size={14} />, color: "from-amber-600/20" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-3 border-white/5 bg-white/[0.02] relative overflow-hidden">
            <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", stat.color)} />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-white/30 mb-2">{stat.icon}<span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span></div>
              {stat.value === null ? <Skeleton className="h-6 w-20 bg-white/5" /> : <p className="text-xl font-black text-white italic">{stat.value}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <Input placeholder={t("findSettlementNodes")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-white/[0.02] border-white/5 rounded-xl text-white italic text-[13px] placeholder:text-white/10" />
        </div>
        {(["all", "PAID", "UNPAID"] as const).map((f) => (
          <Button key={f} variant="ghost" size="sm" onClick={() => setFilter(f)}
            className={cn("h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
              filter === f ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.02] text-white/40 border-white/5")}>
            {f === "all" ? t("all") : f === "PAID" ? t("paid") : t("unpaid")}
          </Button>
        ))}
      </div>

      {/* Records */}
      <div className="rounded-xl border border-white/[0.03] bg-obsidian-800/40 backdrop-blur-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-white/10 mb-3" />
            <p className="text-sm font-black italic text-white/20 uppercase tracking-widest">{t("noReconciliationNodes")}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map((rec, i) => (
              <motion.div key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 px-4 hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                    {rec.user_name?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div>
                    <p className="text-[12px] font-black italic text-white uppercase tracking-tight">{rec.user_name || rec.user_email}</p>
                    <p className="text-[9px] font-bold text-white/30 font-mono mt-0.5">
                      {rec.total_liters?.toFixed?.(1)}L • {rec.utr_reference ? `UTR: ${rec.utr_reference}` : rec.payment_method || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-black italic text-gradient">₹{formatCurrency(Number(rec.amount || 0), locale)}</p>
                  <Badge className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                    rec.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                    {rec.status}
                  </Badge>
                  {rec.status !== "PAID" && rec.utr_reference && (
                    <Button size="sm" onClick={() => { setVerifyingId(rec.id); verifyMutation.mutate(rec.id) }}
                      disabled={verifyMutation.isPending && verifyingId === rec.id}
                      className="h-7 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-black italic text-[9px] uppercase tracking-widest">
                      {verifyMutation.isPending && verifyingId === rec.id ? <Loader2 size={10} className="animate-spin" /> : t("authorize")}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
