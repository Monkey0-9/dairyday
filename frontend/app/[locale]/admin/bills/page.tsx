"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Loader2,
  Calendar,
  Filter,
  ShieldCheck,
  Activity,
  Banknote,
  Fingerprint,
  Zap,
  FileText,
  Sparkles,
  IndianRupee,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { format, subMonths } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { billsApi, paymentsApi } from "@/lib/api"
import { cn, formatApiError } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* ─── Premium Components ─── */

const GlassStat = ({ title, value, icon, subtext, padding = "p-3", loading, delay = 0 }: { title: string; value: string | number; icon: React.ReactNode; subtext?: string; padding?: string; loading?: boolean; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        padding,
        "rounded-xl bg-obsidian-800/40 border border-white/[0.03] backdrop-blur-3xl shadow-glass-elev flex flex-col justify-between group hover:border-white/10 transition-all duration-700 overflow-hidden relative"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.02] to-transparent opacity-50 pointer-events-none" />
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-1.5 rounded-lg border border-white/5 bg-white/5 text-white/40 group-hover:text-primary group-hover:border-primary/20 transition-all duration-700")}>
          {icon}
        </div>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 italic">{title}</p>
      </div>
      <div className="mt-3 relative z-10">
        {loading ? (
          <Skeleton className="h-6 w-16 bg-white/5 rounded-lg" />
        ) : (
          <p className="text-2xl font-black font-heading tracking-tighter italic text-white">{value}</p>
        )}
        {subtext && <p className="text-[7px] font-bold text-white/10 mt-1 uppercase tracking-[0.1em] italic leading-none">{subtext}</p>}
      </div>
    </motion.div>
  )
}

export default function AdminBillsPage() {
  const t = useTranslations("Admin.bills")
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'))
  const [searchTerm, setSearchTerm] = useState("")
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false)

  const [selectedBill, setSelectedBill] = useState<{ id: string; user_name?: string; user_id?: string; total_amount?: number; total_liters?: number; status: string; is_locked?: boolean; pdf_url?: string } | null>(null)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [settlementNote, setSettlementNote] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bills", month],
    queryFn: async () => {
      const res = await billsApi.list(month)
      return res.data
    },
    staleTime: 30_000,
  })

  const bills = data?.bills || []

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await billsApi.generateAll(month)
      return res.data
    },
    onSuccess: (data: { message?: string }) => {
      toast.success(data.message || t("generateSuccess"))
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
    },
    onError: (error: unknown) => {
      toast.error(formatApiError(error))
    }
  })

  const markPaidMutation = useMutation({
    mutationFn: async ({ billId, method, notes }: { billId: string, method: string, notes: string }) => {
      return paymentsApi.markPaid(billId, method, notes)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      toast.success(t("paymentSuccess"))
      setIsCashModalOpen(false)
      setSelectedBill(null)
    },
    onError: (error: unknown) => {
      toast.error(formatApiError(error))
    }
  })

  const filteredBills = bills.filter((bill: { user_name?: string; id: string; status: string }) => {
    const matchesSearch =
      bill.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(bill.id).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !showOnlyUnpaid || bill.status === "UNPAID"
    return matchesSearch && matchesFilter
  })

  const sortedBills = [...filteredBills].sort((a, b) => {
    if (a.status !== b.status) return a.status === "UNPAID" ? -1 : 1
    return Number(b.total_amount) - Number(a.total_amount)
  })

  return (
    <div className="bg-transparent text-white selection:bg-primary/40 space-y-6 pb-12">
      {/* Cinematic Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.03] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary italic">{t('financialGrid')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-heading tracking-[-0.04em] leading-none text-white italic uppercase">
            <span className="opacity-10 block">{t('billingProtocols').split(' ')[0]}</span>
            <span className="text-gradient -mt-1 block italic">{t('billingProtocols').split(' ').slice(1).join(' ')}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 p-1 bg-obsidian-700/40 border border-white/5 rounded-xl shadow-glass-elev backdrop-blur-3xl">
          <div className="flex items-center gap-2 px-3 py-1 border-r border-white/5">
            <Calendar className="text-white/20" size={12} />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-white focus:ring-0 cursor-pointer w-[120px]"
            />
          </div>
          <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            className="h-10 px-6 rounded-xl bg-white text-black hover:bg-primary hover:text-white font-black font-heading italic tracking-tight gap-2 transition-all duration-700 shadow-glow-primary/10 text-sm"
          >
            {generateAllMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            {t('generate').toUpperCase()}
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassStat
          title={t('realizedGrowth')}
          value={`₹${data?.summary.paid_total?.toLocaleString() || "0"}`}
          icon={<TrendingUp size={18} />}
          loading={isLoading}
          delay={0.1}
        />
        <GlassStat
          title={t('outstandingRisk')}
          value={`₹${data?.summary.unpaid_total?.toLocaleString() || "0"}`}
          icon={<AlertCircle size={18} />}
          loading={isLoading}
          delay={0.2}
        />
        <GlassStat
          title={t('totalExposure')}
          value={`₹${((data?.summary.paid_total || 0) + (data?.summary.unpaid_total || 0)).toLocaleString()}`}
          subtext={`${data?.summary.total_bills || 0} ${t('activeLiabilities')}`}
          icon={<IndianRupee size={18} />}
          loading={isLoading}
          delay={0.3}
        />
        <GlassStat
          title={t('efficiencyIndex')}
          value={`${data?.summary.total_bills ? Math.round((data.summary.paid_count / data.summary.total_bills) * 100) : 0}%`}
          subtext={t('liquidityRatio')}
          icon={<CheckCircle2 size={18} />}
          loading={isLoading}
          delay={0.4}
        />
      </div>

      {/* Main Ledger Section */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-obsidian-800/40 p-3 rounded-2xl border border-white/[0.03] backdrop-blur-3xl shadow-glass-elev relative overflow-hidden group">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={14} />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-10 h-10 bg-white/[0.02] border-white/5 rounded-xl text-white font-bold placeholder:text-white/10 italic text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
            className={cn(
              "h-10 px-6 rounded-xl border text-[11px] font-black uppercase tracking-widest italic transition-all duration-700 gap-2",
              showOnlyUnpaid
                ? "bg-rose-500 text-white border-rose-500 shadow-glow-rose/20"
                : "bg-white/[0.02] border-white/10 text-white/40 hover:text-white hover:border-white/20"
            )}
          >
            <Filter size={14} />
            {showOnlyUnpaid ? t("showingUnpaid").toUpperCase() : t("allBills").toUpperCase()}
          </Button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.01] glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/5 hover:bg-transparent bg-white/[0.02]">
                <TableHead className="h-10 px-4 lg:px-6 font-micro tracking-[0.2em] text-white/20 uppercase italic whitespace-nowrap text-[9px]">{t('customerAndId')}</TableHead>
                <TableHead className="hidden lg:table-cell h-10 text-right font-micro tracking-[0.2em] text-white/20 uppercase italic text-[9px]">{t('totalConsumed')}</TableHead>
                <TableHead className="h-10 text-right font-micro tracking-[0.2em] text-white/20 uppercase italic whitespace-nowrap text-[9px]">{t('billAmount')}</TableHead>
                <TableHead className="hidden sm:table-cell h-10 text-center font-micro tracking-[0.2em] text-white/20 uppercase italic text-[9px]">{t('status')}</TableHead>
                <TableHead className="h-10 px-4 lg:px-6 text-right font-micro tracking-[0.2em] text-white/20 uppercase italic text-[9px]">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-white/[0.02]">
                      <TableCell className="px-10 py-8"><Skeleton className="h-12 w-64 bg-white/5 rounded-2xl" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-8 w-24 bg-white/5 ml-auto rounded-xl" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-10 w-20 bg-white/5 ml-auto rounded-xl" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-10 w-32 bg-white/5 mx-auto rounded-full" /></TableCell>
                      <TableCell className="px-10 py-8 text-right"><Skeleton className="h-12 w-32 bg-white/5 ml-auto rounded-2xl" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-[400px] text-center border-none">
                      <div className="flex flex-col items-center justify-center opacity-10">
                        <SearchXIcon size={80} className="mb-6 stroke-[1]" />
                        <p className="font-heading font-black italic text-2xl tracking-[0.2em] uppercase">{t('zeroNodesIdentified')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBills.map((bill: { id: string; user_name?: string; user_id?: string; total_liters?: number; total_amount?: number; status: string; is_locked?: boolean; pdf_url?: string }, idx: number) => (
                    <motion.tr
                      key={bill.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group border-b border-white/[0.02] hover:bg-white/[0.01] transition-all duration-700"
                    >
                      <TableCell className="py-2 lg:py-3 px-3 lg:px-6">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                            <span className="text-[13px] lg:text-sm font-black italic text-white tracking-tighter uppercase group-hover:text-primary transition-colors whitespace-nowrap truncate max-w-[160px] leading-tight">{bill.user_name || t('guestUser')}</span>
                            {bill.is_locked && (
                              <Badge className="bg-primary/20 text-[7px] font-black italic uppercase tracking-[0.1em] text-primary border-primary/20 py-0 px-1.5 w-fit">
                                <ShieldCheck className="w-2 h-2 mr-1" /> SECURED
                              </Badge>
                            )}
                          </div>
                          <p className="text-[7px] font-bold text-white/10 tracking-[0.2em] uppercase italic leading-tight">{t('idNode')} {bill.user_id?.split('-')[0].toUpperCase()}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 hidden lg:table-cell">
                        <span className="text-lg lg:text-xl font-black font-heading italic tracking-tighter text-white/20">
                          {Number(bill.total_liters || 0).toFixed(1)} <span className="text-[8px] opacity-20">L</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2 lg:py-3">
                        <span className="text-lg lg:text-3xl font-black font-heading italic tracking-tighter text-gradient leading-none whitespace-nowrap">
                          ₹{Number(bill.total_amount || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 hidden sm:table-cell">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] italic border shadow-glass-elev",
                          bill.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                        )}>
                          {bill.status === "PAID" ? <CheckCircle2 size={10} /> : <Activity size={10} />}
                          {bill.status === "PAID" ? t('settled').toUpperCase() : t('pending').toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all duration-700">
                          {bill.status === "UNPAID" && (
                            <Button
                              onClick={() => { setSelectedBill(bill); setIsCashModalOpen(true); }}
                              className="h-8 px-4 rounded-xl bg-white text-black hover:bg-primary hover:text-white font-black italic text-[11px] tracking-tight gap-2 transition-all duration-500"
                            >
                              <Banknote size={14} /> {t('settleCash').toUpperCase()}
                            </Button>
                          )}
                          <PdfDownloadButton bill={bill} />
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Settlement Protocol Modal */}
      <Dialog open={isCashModalOpen} onOpenChange={setIsCashModalOpen}>
        <DialogContent className="max-w-[440px] bg-obsidian-900 border-white/5 text-white rounded-2xl p-0 flex flex-col fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] shadow-2xl overflow-hidden focus:outline-none focus:ring-0 border-0">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Modal Header - Fixed */}
            <div className="p-6 pb-2">
              <DialogHeader className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow-emerald/10">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl lg:text-2xl font-black font-heading italic tracking-tight uppercase leading-none">{t('settlementProto')}</DialogTitle>
                  <DialogDescription className="text-white/30 tracking-[0.2em] uppercase mt-1 text-[8px] font-bold">
                    {t('finalizingReconciliation')} {selectedBill?.user_id?.split('-')[0].toUpperCase()}
                  </DialogDescription>
                </div>
              </DialogHeader>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-4">
              {selectedBill && (
                <div className="space-y-4">
                  {/* Ledger Data Card */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 group shadow-inner">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic">{t('subject')}</p>
                      <p className="text-lg font-black italic uppercase tracking-tighter truncate leading-tight">{selectedBill.user_name || t('guestUser')}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic">{t('yieldValue')}</p>
                      <p className="text-2xl font-black italic text-emerald-400 tracking-tighter leading-none">₹{selectedBill.total_amount}</p>
                    </div>
                  </div>

                  {/* Ledger Annotation Node */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic ml-1 px-1">Ledger_Annotation_Node</label>
                    <textarea
                      placeholder="Transmission details or physical cash receipt ID..."
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-[11px] font-bold text-white/60 focus:border-emerald-500/50 focus:ring-0 transition-all min-h-[80px] resize-none italic"
                      onChange={(e) => setSettlementNote(e.target.value)}
                      value={settlementNote}
                    />
                  </div>

                  {/* Verification Note */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mb-2">
                    <ShieldCheck className="text-emerald-500 w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold italic text-emerald-500/40 uppercase tracking-tight leading-relaxed">
                      {t('cashManualNote')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <DialogFooter className="sticky bottom-0 bg-obsidian-900/95 backdrop-blur-2xl border-t border-white/5 p-6 pt-4 gap-3 sm:flex-row flex-col z-20">
              <Button
                variant="ghost"
                onClick={() => setIsCashModalOpen(false)}
                className="h-12 flex-1 rounded-xl text-[9px] font-black text-white/20 hover:text-white uppercase tracking-[0.2em] transition-all border border-white/5 hover:bg-white/5"
              >
                {t('abortSettlement').toUpperCase()}
              </Button>
              <Button
                onClick={() => {
                  if (selectedBill) {
                    markPaidMutation.mutate({
                      billId: selectedBill.id,
                      method: "CASH",
                      notes: settlementNote || "ELITE_ADMIN_CASH_AUTH"
                    });
                    setIsCashModalOpen(false);
                    setSettlementNote("");
                    toast.success("AUTHORIZATION_GRANTED :: RECONCILIATION_COMPLETE");
                  }
                }}
                disabled={markPaidMutation.isPending}
                className="h-12 flex-[2] px-8 rounded-xl bg-white text-black hover:bg-emerald-500 hover:text-white font-black italic text-lg tracking-tight gap-3 transition-all duration-700 shadow-glow-white/10 hover:shadow-glow-emerald/30 group disabled:opacity-50"
              >
                {markPaidMutation.isPending ? <Loader2 className="animate-spin" /> : <Zap className="fill-current group-hover:scale-125 transition-transform" size={20} />}
                {t('authorizeSettlement').toUpperCase()}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PdfDownloadButton({ bill }: { bill: { id: string; is_locked?: boolean; pdf_url?: string } }) {
  const t = useTranslations("Admin.bills")
  const { data: statusData } = useQuery({
    queryKey: ["pdf-status", bill.id],
    queryFn: async () => {
      const res = await billsApi.getPdfStatus(bill.id)
      return res.data
    },
    enabled: !!bill.is_locked && !bill.pdf_url,
    refetchInterval: (query) => (query.state.data as { status?: string })?.status === "completed" ? false : 5000,
  })

  const pdfUrl = bill.pdf_url || statusData?.pdf_url

  if (pdfUrl) {
    return (
      <Button
        variant="ghost"
        onClick={() => window.open(pdfUrl, '_blank')}
        className="h-8 px-4 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 font-black italic text-[11px] tracking-widest uppercase gap-2 transition-all"
      >
        <FileText size={14} /> {t('logPdf').toUpperCase()}
      </Button>
    )
  }

  if (bill.is_locked) {
    return (
      <Button variant="ghost" disabled className="h-12 px-6 rounded-xl bg-white/5 opacity-40 font-micro italic text-[10px] tracking-widest uppercase gap-3">
        <Loader2 className="h-4 w-4 animate-spin" /> {t('encrypting')}
      </Button>
    )
  }

  return <span className="font-micro text-white/10 italic uppercase tracking-[0.4em] mr-4">{t('draftState')}</span>
}

function SearchXIcon({ size = 24, className = "" }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="m21 21-4.3-4.3" /><circle cx="10" cy="10" r="7" /><path d="m8 12 4-4" /><path d="m12 12-4-4" />
    </svg>
  );
}
