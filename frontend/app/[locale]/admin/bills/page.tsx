"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations, useLocale } from "next-intl"
import { format, subMonths, addMonths } from "date-fns"
import { formatCurrency, getDateFnsLocale } from "@/lib/i18n-utils"
import { billsApi, paymentsApi } from "@/lib/api"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  Receipt, Search, ChevronLeft, ChevronRight, IndianRupee,
  FileText, CheckCircle2, Clock, Loader2, TrendingUp, Zap, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Bill {
  id: string
  user_id: string
  user_name?: string
  user_email?: string
  month: string
  total_liters: number
  amount: number
  status: "UNPAID" | "PAID" | "PENDING"
}

export default function BillsPage() {
  const t = useTranslations("Admin.bills")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const queryClient = useQueryClient()

  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [filterUnpaid, setFilterUnpaid] = useState(false)
  const [payingBillId, setPayingBillId] = useState<string | null>(null)

  const monthStr = format(selectedMonth, "yyyy-MM")

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ["admin-bills", monthStr],
    queryFn: async () => {
      const res = await billsApi.list(monthStr)
      return res.data
    },
    staleTime: 30_000,
  })

  const generateAllMutation = useMutation({
    mutationFn: () => billsApi.generateAll(monthStr),
    onSuccess: () => {
      toast.success(t("generateSuccess"))
      queryClient.invalidateQueries({ queryKey: ["admin-bills", monthStr] })
    },
    onError: (err) => toast.error(formatApiError(err)),
  })

  const markPaidMutation = useMutation({
    mutationFn: (billId: string) => paymentsApi.markPaid(billId, "CASH"),
    onSuccess: () => {
      toast.success(t("paymentSuccess"))
      setPayingBillId(null)
      queryClient.invalidateQueries({ queryKey: ["admin-bills", monthStr] })
    },
    onError: (err) => { toast.error(formatApiError(err)); setPayingBillId(null) },
  })

  const filtered = useMemo(() =>
    bills.filter((b) => {
      const matchSearch = !searchQuery || b.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchFilter = !filterUnpaid || b.status !== "PAID"
      return matchSearch && matchFilter
    }), [bills, searchQuery, filterUnpaid])

  const stats = useMemo(() => {
    const total = bills.length
    const paid = bills.filter((b) => b.status === "PAID").length
    const unpaid = total - paid
    const totalDue = bills.filter((b) => b.status !== "PAID").reduce((s, b) => s + Number(b.amount || 0), 0)
    const totalLiters = bills.reduce((s, b) => s + Number(b.total_liters || 0), 0)
    const rate = total > 0 ? Math.round((paid / total) * 100) : 0
    return { total, paid, unpaid, totalDue, totalLiters, rate }
  }, [bills])

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-white/[0.03] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.05] bg-white/[0.02] mb-2">
            <ShieldCheck className="h-1.5 w-1.5 text-primary" />
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary italic">FINANCIAL_LEDGER</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black font-heading tracking-tight text-white italic uppercase">
            <span className="opacity-10 block">Bills &</span>
            <span className="text-gradient -mt-1 block italic lowercase">payments</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-0.5 bg-obsidian-700/40 border border-white/5 rounded-lg backdrop-blur-3xl">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))} aria-label={tCommon("accessibility.previousMonth")}>
              <ChevronLeft size={12} />
            </Button>
            <div className="px-3 py-0.5 flex items-center gap-1.5 min-w-[120px] justify-center text-[10px] font-black uppercase tracking-widest text-white italic">
              {format(selectedMonth, "MMM yyyy", { locale: dateFnsLocale })}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setSelectedMonth(prev => addMonths(prev, 1))} aria-label={tCommon("accessibility.nextMonth")}>
              <ChevronRight size={12} />
            </Button>
          </div>
          <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            className="h-8 px-4 rounded-lg bg-primary text-white hover:bg-primary/80 font-black italic tracking-tight gap-1.5 text-xs"
          >
            {generateAllMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {t("generateAll")}
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("totalBills"), value: isLoading ? null : stats.total, icon: <FileText size={14} />, color: "from-blue-600/20" },
          { label: t("pendingDues"), value: isLoading ? null : `₹${formatCurrency(stats.totalDue, locale)}`, icon: <IndianRupee size={14} />, color: "from-rose-600/20" },
          { label: t("totalLiters"), value: isLoading ? null : `${stats.totalLiters.toFixed(1)}L`, icon: <Receipt size={14} />, color: "from-cyan-600/20" },
          { label: t("collectionRate"), value: isLoading ? null : `${stats.rate}%`, icon: <TrendingUp size={14} />, color: "from-emerald-600/20" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-3 border-white/5 bg-white/[0.02] relative overflow-hidden">
            <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", stat.color)} />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-white/30 mb-2">{stat.icon}<span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span></div>
              {stat.value === null ? <Skeleton className="h-6 w-20 bg-white/5" /> : (
                <p className="text-xl font-black text-white italic">{stat.value}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <Input placeholder={t("searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-white/[0.02] border-white/5 rounded-xl text-white italic text-[13px] placeholder:text-white/10" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFilterUnpaid(!filterUnpaid)}
          className={cn("h-9 rounded-xl text-[9px] font-black uppercase tracking-widest px-3 border transition-all",
            filterUnpaid ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.02] text-white/40 border-white/5")}>
          {filterUnpaid ? t("showingUnpaid") : t("allBills")}
        </Button>
      </div>

      {/* Bills Table */}
      <div className="rounded-xl border border-white/[0.03] bg-obsidian-800/40 backdrop-blur-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="mx-auto h-10 w-10 text-white/10 mb-3" />
            <p className="text-sm font-black italic text-white/20 uppercase tracking-widest">{t("zeroNodesIdentified")}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            <AnimatePresence>
              {filtered.map((bill, i) => (
                <motion.div key={bill.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-3 px-4 hover:bg-white/[0.02] transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                      {bill.user_name?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div>
                      <p className="text-[12px] font-black italic text-white uppercase tracking-tight">{bill.user_name || bill.user_email}</p>
                      <p className="text-[9px] font-bold text-white/30 font-mono mt-0.5">{bill.total_liters?.toFixed(1)}L • {bill.month}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-black italic text-gradient">₹{formatCurrency(Number(bill.amount), locale)}</p>
                    <Badge className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                      bill.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                      {bill.status === "PAID" ? <CheckCircle2 size={8} className="mr-1" /> : <Clock size={8} className="mr-1" />}
                      {bill.status}
                    </Badge>
                    {bill.status !== "PAID" && (
                      <Button size="sm" onClick={() => { setPayingBillId(bill.id); markPaidMutation.mutate(bill.id) }}
                        disabled={markPaidMutation.isPending && payingBillId === bill.id}
                        className="h-7 px-3 rounded-lg bg-white text-black hover:bg-primary hover:text-white font-black italic text-[9px] uppercase tracking-widest transition-all">
                        {markPaidMutation.isPending && payingBillId === bill.id ? <Loader2 size={10} className="animate-spin" /> : t("payInCash")}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
