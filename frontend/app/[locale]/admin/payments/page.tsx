"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Banknote,
  Clock,
  Zap,
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  Fingerprint,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"
import { getDateFnsLocale } from "@/lib/i18n-utils"
import { format as formatDate } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, paymentsApi } from "@/lib/api"
import { cn, formatApiError } from "@/lib/utils"

/* ─── Premium Components ─── */

const SettlementStat = ({ icon, label, value, subtext, color, delay = 0 }: { icon: React.ReactNode; label: string; value: string; subtext?: string; color: "green" | "red" | "blue" | "neutral"; delay?: number }) => {
  const colors = {
    green: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    red: "text-rose-500 border-rose-500/20 bg-rose-500/5",
    blue: "text-primary border-primary/20 bg-primary/5",
    neutral: "text-white/20 border-white/5 bg-white/[0.02]",
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      className="p-3 rounded-xl glass-card flex flex-col items-center justify-center text-center group hover:border-primary/30 transition-all duration-700 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-50" />
      <div className={cn("p-2 rounded-lg mb-2 border transition-all duration-700 group-hover:scale-110 shadow-glass-elev relative z-10", colors[color as keyof typeof colors])}>
        {icon}
      </div>
      <div className="relative z-10">
        <span className="text-xl font-black font-heading tracking-tight italic text-white leading-none">
          {value}
        </span>
      </div>
      <p className="font-micro text-[10px] text-white/30 mt-1 italic relative z-10 uppercase tracking-[0.2em]">{label}</p>
      {subtext && <p className="font-micro text-[9px] text-white/10 mt-0.5 uppercase tracking-widest relative z-10">{subtext}</p>}
    </motion.div>
  )
}

export default function AdminPaymentsPage() {
  const t = useTranslations("Admin.payments")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const queryClient = useQueryClient()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.toISOString().slice(5, 7))
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString())
  const month = `${selectedYear}-${selectedMonth}`
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<{ id: string; user_name: string; total_amount: number; user_id: string } | null>(null)
  const [paymentNotes, setPaymentNotes] = useState("")

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payments-dashboard", month],
    queryFn: async () => {
      const res = await adminApi.getPaymentsDashboard(month)
      return res.data
    },
    staleTime: 30_000,
  })

  const markPaidMutation = useMutation({
    mutationFn: async (billId: string) => paymentsApi.markPaid(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments-dashboard", month] })
      toast.success("PAYMENT_AUTH_SUCCESS: State synchronized.")
      setCashModalOpen(false)
      setSelectedBill(null)
      setPaymentNotes("")
    },
    onError: (error: unknown) => {
      toast.error(formatApiError(error))
    },
  })

  const handleRecordPayment = () => {
    if (!paymentNotes.trim()) {
      toast.error("LEDGER_ERROR: Annotation required for manual settlement.")
      return
    }
    if (selectedBill) markPaidMutation.mutate(selectedBill.id)
  }

  const sortedBills = useMemo(() => {
    if (!data?.bills) return []
    return data.bills
      .filter((bill: { user_name: string; user_id: string; status: string }) => {
        const matchesStatus = filterStatus === "ALL" || bill.status === filterStatus
        const matchesSearch =
          bill.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bill as { user_email?: string }).user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.user_id.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesStatus && matchesSearch
      })
      .sort((a: { status: string; total_amount: number }, b: { status: string; total_amount: number }) => {
        if (a.status !== b.status) return a.status === "UNPAID" ? -1 : 1
        return b.total_amount - a.total_amount
      })
  }, [data?.bills, filterStatus, searchTerm])

  return (
    <div className="bg-transparent text-white selection:bg-primary/40 relative space-y-6">
      {/* Header Command Area */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-white/[0.05] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary animate-pulse" />
            <span className="font-micro text-[10px] text-primary tracking-[0.4em] uppercase">{t('ledgerSettlement')}</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black font-heading italic uppercase tracking-tighter leading-none">{t('vaultControl').split(' ')[0]} <span className="text-gradient">{t('vaultControl').split(' ').slice(1).join(' ')}</span></h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-xl glass-card px-3 py-1.5 min-w-[200px]">
            <Calendar className="h-4 w-4 text-white/20" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-transparent border-none text-sm font-heading font-black italic uppercase tracking-tight text-white outline-none w-[70px] h-6 p-0">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent className="bg-obsidian-800 border-white/10 text-white">
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0')
                  return (
                    <SelectItem key={m} value={m} className="text-[10px] font-black uppercase italic">
                      {formatDate(new Date(2024, i, 1), 'MMM', { locale: dateFnsLocale })}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-transparent border-none text-sm font-heading font-black italic uppercase tracking-tight text-white outline-none w-[80px] h-6 p-0">
                <SelectValue placeholder="YYYY" />
              </SelectTrigger>
              <SelectContent className="bg-obsidian-800 border-white/10 text-white">
                {Array.from({ length: 5 }, (_, i) => {
                  const y = (new Date().getFullYear() - 2 + i).toString()
                  return (
                    <SelectItem key={y} value={y} className="text-[10px] font-black uppercase italic">
                      {y}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 px-6 rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/5 font-heading font-black italic text-sm uppercase tracking-tight gap-2 transition-all duration-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-primary fill-current" />}
            {t('rescanVault')}
          </Button>
        </div>
      </header>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SettlementStat
          color="green"
          icon={<TrendingUp size={18} />}
          label={t('realizedGrowth')}
          value={`₹${data?.summary.paid_total?.toLocaleString() || "0"}`}
          subtext={`${data?.summary.paid_count || 0} ${t('depositsVerified')}`}
          delay={0.1}
        />
        <SettlementStat
          color="red"
          icon={<AlertCircle size={18} />}
          label={t('outstandingRisk')}
          value={`₹${data?.summary.unpaid_total?.toLocaleString() || "0"}`}
          subtext={`${data?.summary.unpaid_count || 0} ${t('nodesPending')}`}
          delay={0.2}
        />
        <SettlementStat
          color="blue"
          icon={<IndianRupee size={18} />}
          label={t('totalExposure')}
          value={`₹${((data?.summary.paid_total || 0) + (data?.summary.unpaid_total || 0)).toLocaleString()}`}
          subtext={`${data?.summary.total_bills || 0} ${t('activeLiabilities')}`}
          delay={0.3}
        />
        <SettlementStat
          color="neutral"
          icon={<CheckCircle2 size={18} />}
          label={t('efficiencyIndex')}
          value={`${data?.summary.total_bills ? Math.round((data.summary.paid_count / data.summary.total_bills) * 100) : 0}%`}
          subtext={t('liquidityRatio')}
          delay={0.4}
        />
      </div>

      {/* Tactical Control Hub */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5 glass-card shadow-glass-elev">
          <div className="relative group w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within:text-primary transition-colors" />
            <Input
              id="payment-search-input"
              placeholder={t('findSettlementNodes')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full bg-white/[0.02] border border-white/5 rounded-xl pl-10 pr-4 text-[13px] font-heading font-black italic tracking-tight placeholder:text-white/5 outline-none transition-all duration-700 hover:border-white/10 focus:border-primary/40 focus:bg-white/[0.04]"
              aria-label={tCommon('accessibility.search')}
            />
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 flex-1 lg:flex-none">
              {["ALL", "UNPAID", "PAID"].map((s) => (
                <button
                  key={s}
                  id={`filter-status-${s.toLowerCase()}`}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "flex-1 lg:flex-none px-4 py-1.5 rounded-lg font-heading font-black italic text-[10px] uppercase tracking-tighter transition-all duration-500",
                    filterStatus === s ? "bg-white text-black shadow-lg" : "text-white/20 hover:text-white/40"
                  )}
                >
                  {t(s.toLowerCase())}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-white/5 hover:bg-white/5 hover:border-primary/30 transition-all flex-shrink-0">
              <Download size={18} className="text-white/40 group-hover:text-primary" />
            </Button>
          </div>
        </div>

        {/* Settlement Ledger List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/[0.02]" />
              ))
            ) : sortedBills.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[300px] flex flex-col items-center justify-center space-y-4 opacity-10">
                <Search className="w-12 h-12 stroke-[1]" />
                <p className="font-heading font-black italic text-sm tracking-[0.2em] uppercase">{t('noReconciliationNodes')}</p>
              </motion.div>
            ) : (
              sortedBills.map((bill: { id: string; user_name: string; user_id: string; total_amount: number; total_liters: number; status: string }, i: number) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-3 rounded-2xl border transition-all duration-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4",
                    bill.status === "UNPAID"
                      ? "glass-card border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40"
                      : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center font-heading font-black italic text-sm text-white/10 group-hover:text-primary transition-all">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-lg font-heading font-black italic tracking-tight text-white uppercase group-hover:text-primary transition-colors">{bill.user_name}</h3>
                      <span className="font-mono text-[11px] text-white/70 tracking-wide mt-0.5 block">
                        {(bill as { user_email?: string }).user_email || t('nodeId') + " " + bill.user_id.split("-")[0].toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between xl:justify-end flex-wrap gap-4">
                    <div className="text-right space-y-0.5">
                      <span className="text-2xl font-heading font-black italic tracking-tighter text-gradient leading-none">₹{bill.total_amount.toLocaleString()}</span>
                      <p className="font-micro text-[10px] text-white/20 uppercase tracking-[0.1em]">{bill.total_liters.toFixed(1)} {t('consumed')}</p>
                    </div>

                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-heading font-black italic text-[9px] uppercase tracking-tight border",
                      bill.status === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-glow-emerald/5"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-glow-rose/5 animate-pulse"
                    )}>
                      {bill.status === "PAID" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {bill.status === "PAID" ? t('verified') : t('pendingAuth')}
                    </div>

                    <div className="min-w-[120px] flex justify-end">
                      {bill.status === "UNPAID" ? (
                        <Button
                          id={`authorize-btn-${bill.id}`}
                          onClick={() => { setSelectedBill(bill); setCashModalOpen(true); }}
                          className="h-8 px-4 rounded-lg bg-white text-black hover:bg-primary hover:text-white font-heading font-black italic text-xs tracking-tighter gap-2 transition-all duration-700 shadow-lg"
                        >
                          <Zap size={14} className="fill-current" />
                          {t('authorize')}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400/40 italic font-heading font-black">
                          <span className="text-[10px] uppercase tracking-widest">{t('settled')}</span>
                          <CheckCircle2 size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cyber Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-white" />
        <div className="absolute top-0 left-2/4 w-[1px] h-full bg-white" />
        <div className="absolute top-0 left-3/4 w-[1px] h-full bg-white" />
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-white" />
        <div className="absolute top-2/4 left-0 w-full h-[1px] bg-white" />
        <div className="absolute top-3/4 left-0 w-full h-[1px] bg-white" />
      </div>

      {/* Industrial Settlement Modal */}
      <ResponsiveDialog
        isOpen={cashModalOpen}
        setIsOpen={setCashModalOpen}
        className="bg-obsidian-900/95 backdrop-blur-3xl border border-white/5 rounded-2xl w-[95vw] max-w-md shadow-[0_0_100px_rgba(14,165,168,0.1)] glass-card p-0 overflow-hidden"
        title={
          <div className="space-y-3 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow-primary/10 mb-3">
              <Fingerprint size={24} />
            </div>
            <span className="text-2xl font-black font-heading tracking-tight italic uppercase block">{t('settlementHandoff')}</span>
          </div>
        }
        description={
          <span className="font-micro text-[10px] text-white/30 tracking-[0.2em] uppercase mt-1 block">{t('manualAuthProto')}</span>
        }
      >
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar p-6 pt-0">
            <div className="space-y-6 relative">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12">
                <Banknote size={100} />
              </div>

              {selectedBill && (
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/[0.05] relative z-10">
                  <div className="space-y-1">
                    <p className="font-micro text-[10px] text-white/20 uppercase tracking-[0.2em]">{t('targetSubject')}</p>
                    <p className="text-xl font-black font-heading tracking-tighter italic uppercase">{selectedBill.user_name}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="font-micro text-[10px] text-white/20 uppercase tracking-[0.2em]">{t('settlementValue')}</p>
                    <p className="text-3xl font-black font-heading tracking-tighter italic text-primary leading-none">₹{selectedBill.total_amount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 relative z-10">
                <Label className="font-micro text-[10px] text-white/20 uppercase tracking-[0.2em] ml-1">{t('ledgerAnnotation')}</Label>
                <Textarea
                  id="recon-ledger-annotation"
                  placeholder={t('entryMetadataStream')}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="min-h-[100px] bg-white/[0.03] border-white/10 rounded-xl p-4 text-lg italic font-heading tracking-tight focus:border-primary/40 focus:bg-white/[0.05] transition-all outline-none"
                />
              </div>

              <DialogFooter className="pt-4 gap-4 relative z-10">
                <Button variant="ghost" onClick={() => setCashModalOpen(false)} className="h-10 flex-1 rounded-xl font-micro text-[10px] text-white/20 hover:text-white uppercase tracking-widest transition-all">
                  {t('abortSequence')}
                </Button>
                <Button
                  id="execute-recon-btn"
                  onClick={handleRecordPayment}
                  disabled={markPaidMutation.isPending}
                  className="h-12 px-6 rounded-xl bg-white text-black hover:bg-primary hover:text-white font-heading font-black italic tracking-tighter text-xl gap-3 group transition-all duration-700 shadow-xl"
                >
                  {markPaidMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : <Zap size={18} className="fill-current" />}
                  {t('executeRecon')}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform duration-700" />
                </Button>
              </DialogFooter>
            </div>
          </div>
      </ResponsiveDialog>
    </div>
  )
}
