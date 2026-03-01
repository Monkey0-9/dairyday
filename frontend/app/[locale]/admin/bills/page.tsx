"use client"

import React, { useState } from "react"
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
  Banknote,
  Fingerprint,
  Zap,
  FileText,
  Sparkles,
  IndianRupee,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import { format, subMonths } from "date-fns"
import { formatCurrency, getDateFnsLocale, getStatusKey } from "@/lib/i18n-utils"
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
import { EmptyBillState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/skeletons"
import { PremiumErrorState } from "@/components/ui/state-displays"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { billsApi, paymentsApi, adminApi } from "@/lib/api"
import { cn, formatApiError } from "@/lib/utils"
import { DialogFooter } from "@/components/ui/dialog"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
          {React.cloneElement(icon as React.ReactElement, { size: 14, "aria-hidden": "true" })}
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

interface Bill {
  id: string;
  user_name?: string;
  user_id?: string;
  total_liters?: number;
  total_amount?: number;
  status: string;
  is_locked?: boolean;
  pdf_url?: string;
  utr_reference?: string;
  utr_submitted_at?: string;
}

export default function AdminBillsPage() {
  const t = useTranslations("Admin.bills")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const queryClient = useQueryClient()
  const initialDate = subMonths(new Date(), 1)
  const [selectedMonth, setSelectedMonth] = useState(format(initialDate, 'MM'))
  const [selectedYear, setSelectedYear] = useState(format(initialDate, 'yyyy'))
  const month = `${selectedYear}-${selectedMonth}`
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [settlementNote, setSettlementNote] = useState("")

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([])
  const [minAmount, setMinAmount] = useState<string>("")
  const [maxAmount, setMaxAmount] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const generateAllMutation = useMutation({
    mutationFn: (month: string) => billsApi.generateAll(month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      toast.success(t('genComplete'))
    },
    onError: (err) => toast.error(t('criticalFault', { error: formatApiError(err) }))
  })

  const bulkActionMutation = useMutation({
    mutationFn: (data: { bill_ids: string[]; status?: string; notes?: string }) => billsApi.bulkAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      toast.success(t('syncComplete'))
      setSelectedBillIds([])
    },
    onError: (err) => toast.error(t('criticalFault', { error: formatApiError(err) }))
  })

  const remindMutation = useMutation({
    mutationFn: (billId: string) => adminApi.sendReminder(billId),
    onSuccess: () => toast.success(t('reminderSent')),
    onError: (err) => toast.error(formatApiError(err))
  })

  const markPaidMutation = useMutation({
    mutationFn: async ({ billId, method, notes }: { billId: string, method: string, notes: string }) => {
      return paymentsApi.markPaid(billId, method, notes)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      toast.success(t('paymentRecorded'))
      setIsCashModalOpen(false)
      setSelectedBill(null)
      setSettlementNote("")
    },
    onError: (err) => toast.error(formatApiError(err))
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-bills", month],
    queryFn: async () => {
      const res = await billsApi.list(month)
      return res.data
    },
    staleTime: 30_000,
  })

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20">
        <PremiumErrorState 
          message={t('billsLoadError') || "Failed to load billing records"} 
          onRetry={() => refetch()} 
        />
      </div>
    )
  }

  const bills = data?.bills || []

  const filteredBills = bills.filter((bill: { user_name?: string; id: string; status: string; total_amount?: number }) => {
    const matchesSearch =
      bill.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(bill.id).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || bill.status === statusFilter
    const amount = Number(bill.total_amount || 0)
    const matchesMinAmount = !minAmount || amount >= Number(minAmount)
    const matchesMaxAmount = !maxAmount || amount <= Number(maxAmount)

    return matchesSearch && matchesStatus && matchesMinAmount && matchesMaxAmount
  })

  const sortedBills = [...filteredBills].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "OVERDUE") return -1
      if (b.status === "OVERDUE") return 1
      if (a.status === "UNPAID") return -1
      if (b.status === "UNPAID") return 1
    }
    return Number(b.total_amount) - Number(a.total_amount)
  })

  const toggleAll = () => {
    if (selectedBillIds.length === sortedBills.length) {
      setSelectedBillIds([])
    } else {
      setSelectedBillIds(sortedBills.map(b => b.id))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

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
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-white focus:ring-0 cursor-pointer w-[60px] h-8 p-0">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent className="bg-obsidian-800 border-white/10 text-white">
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0')
                  return (
                    <SelectItem key={m} value={m} className="text-[10px] font-black uppercase italic">
                      {format(new Date(2024, i, 1), 'MMM', { locale: dateFnsLocale })}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-white focus:ring-0 cursor-pointer w-[70px] h-8 p-0">
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
            onClick={() => generateAllMutation.mutate(month)}
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
          value={`₹${formatCurrency(data?.summary.paid_total || 0, locale)}`}
          icon={<TrendingUp size={18} />}
          loading={isLoading}
          delay={0.1}
        />
        <GlassStat
          title={t('outstandingRisk')}
          value={`₹${formatCurrency(data?.summary.unpaid_total || 0, locale)}`}
          icon={<AlertCircle size={18} />}
          loading={isLoading}
          delay={0.2}
        />
        <GlassStat
          title={t('totalExposure')}
          value={`₹${formatCurrency((data?.summary.paid_total || 0) + (data?.summary.unpaid_total || 0) + (data?.summary.overdue_total || 0), locale)}`}
          subtext={`${data?.summary.total_bills || 0} ${t('activeLiabilities')}`}
          icon={<IndianRupee size={18} />}
          loading={isLoading}
          delay={0.3}
        />
        <GlassStat
          title="DELINQUENCY"
          value={`₹${formatCurrency(data?.summary.overdue_total || 0, locale)}`}
          subtext={`${data?.summary.overdue_count || 0} OVERDUE NODES`}
          icon={<Clock className="text-rose-500" size={18} />}
          loading={isLoading}
          delay={0.4}
        />
      </div>

      {/* Main Ledger Section */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-obsidian-800/40 p-3 rounded-2xl border border-white/[0.03] backdrop-blur-3xl shadow-glass-elev relative overflow-hidden group">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={14} aria-hidden="true" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-10 h-10 bg-white/[0.02] border-white/5 rounded-xl text-white font-bold placeholder:text-white/10 italic text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={tCommon('accessibility.search')}
            />
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-10 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest italic transition-all duration-700 gap-2",
                    statusFilter !== "ALL" || minAmount || maxAmount
                      ? "bg-primary/20 text-primary border-primary/20"
                      : "bg-white/[0.02] border-white/10 text-white/40 hover:text-white"
                  )}
                >
                  <Filter size={14} />
                  {t('filterGrid').toUpperCase()}
                  {(statusFilter !== "ALL" || minAmount || maxAmount) && (
                    <Badge className="ml-1 bg-primary text-black h-4 w-4 p-0 flex items-center justify-center rounded-full text-[8px] font-black">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-obsidian-900 border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-3xl">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-white/20 italic tracking-widest">Protocol_Status_Filter</p>
                    <div className="flex flex-wrap gap-2">
                      {["ALL", "PAID", "UNPAID", "OVERDUE"].map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatusFilter(s)}
                          className={cn(
                            "h-7 px-3 text-[9px] font-black italic rounded-lg border transition-all",
                            statusFilter === s 
                              ? "bg-primary text-black border-primary shadow-glow-primary/20" 
                              : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                          )}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-white/20 italic tracking-widest">Amount_Matrix_Range</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="MIN"
                        type="number"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="bg-white/5 border-white/5 text-[10px] h-8 font-black italic"
                      />
                      <Input
                        placeholder="MAX"
                        type="number"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className="bg-white/5 border-white/5 text-[10px] h-8 font-black italic"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => { setStatusFilter("ALL"); setMinAmount(""); setMaxAmount(""); }}
                    className="w-full h-8 text-[9px] font-black uppercase italic bg-white/5 hover:bg-white/10 border border-white/5"
                  >
                    Reset_Matrix_Settings
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.01] glass-card overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="border-b border-white/5 hover:bg-transparent bg-white/[0.02]">
                <TableHead className="w-[40px] px-4">
                  <Checkbox 
                    checked={selectedBillIds.length === sortedBills.length && sortedBills.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
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
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <TableSkeleton rows={8} cols={6} />
                    </TableCell>
                  </TableRow>
                ) : filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96 text-center border-none p-0">
                      <EmptyBillState />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBills.map((bill: Bill, idx: number) => (
                      <motion.tr
                        key={bill.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "group border-b border-white/[0.02] hover:bg-white/[0.01] transition-all duration-700",
                          selectedBillIds.includes(bill.id) && "bg-white/[0.03]"
                        )}
                      >
                        <TableCell className="px-4 py-3">
                          <Checkbox 
                            checked={selectedBillIds.includes(bill.id)}
                            onCheckedChange={() => toggleOne(bill.id)}
                            aria-label={`Select ${bill.user_name}`}
                          />
                        </TableCell>
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
                          {bill.utr_reference && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Fingerprint className="w-2.5 h-2.5 text-primary/40" />
                              <span className="text-[9px] font-black tracking-widest text-primary/60 truncate max-w-[120px]">UTR: {bill.utr_reference}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 hidden lg:table-cell">
                        <span className="text-lg lg:text-xl font-black font-heading italic tracking-tighter text-white/20">
                          {Number(bill.total_liters || 0).toFixed(1)} <span className="text-[8px] opacity-20">L</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2 lg:py-3">
                        <span className="text-lg lg:text-3xl font-black font-heading italic tracking-tighter text-gradient leading-none whitespace-nowrap">
                          ₹{formatCurrency(Number(bill.total_amount || 0), locale)}
                        </span>
                      </TableCell>
                        <TableCell className="text-center py-3 hidden sm:table-cell">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] italic border shadow-glass-elev",
                            bill.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : bill.status === "OVERDUE"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-glow-rose/10"
                                : bill.utr_reference
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-glow-blue/10"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-glow-amber/5"
                          )}>
                            {bill.status === "PAID" 
                              ? <CheckCircle2 size={10} aria-hidden="true" /> 
                              : bill.status === "OVERDUE"
                                ? <AlertCircle size={10} aria-hidden="true" className="animate-pulse" />
                                : bill.utr_reference 
                                  ? <Loader2 size={10} className="animate-spin" aria-hidden="true" /> 
                                  : <Clock size={10} aria-hidden="true" />}
                            
                            {bill.status === "UNPAID" && bill.utr_reference
                              ? tCommon('status.PENDING').toUpperCase()
                              : bill.status === "OVERDUE"
                                ? "OVERDUE"
                                : tCommon(`status.${getStatusKey(bill.status)}`).toUpperCase()}
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
                           {bill.status === "UNPAID" && (
                            <Button
                              onClick={() => remindMutation.mutate(bill.id)}
                              disabled={remindMutation.isPending}
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 text-white/40 hover:text-primary transition-all"
                              title={t('sendReminder') || "Send Reminder"}
                              aria-label={t('sendReminder') || "Send Reminder"}
                            >
                              {remindMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Clock size={14} aria-hidden="true" />}
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

        {/* Bulk Action Panel - Cinematic Floating Bar */}
        <AnimatePresence>
          {selectedBillIds.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[600px] px-4"
            >
              <div className="bg-obsidian-900/90 border border-white/10 backdrop-blur-2xl px-6 py-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Zap size={20} className="fill-current" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-none">{selectedBillIds.length} Nodes Selected</p>
                    <p className="text-[8px] font-bold text-white/20 uppercase mt-1 tracking-widest">Awaiting execution_protocol...</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <Button
                    onClick={() => bulkActionMutation.mutate({ bill_ids: selectedBillIds, status: "PAID", notes: "BULK_LEDGER_SYNCHRONIZATION" })}
                    disabled={bulkActionMutation.isPending}
                    className="h-10 px-6 rounded-xl bg-white text-black hover:bg-emerald-500 hover:text-white font-black italic tracking-tight gap-2 transition-all duration-700"
                  >
                    {bulkActionMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    RECONCILE_SELECTED
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedBillIds([])}
                    className="h-10 px-4 rounded-xl border border-white/5 text-white/40 hover:text-white transition-all uppercase text-[9px] font-black italic"
                  >
                    ABORT
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Settlement Protocol Modal */}
      <ResponsiveDialog
        isOpen={isCashModalOpen}
        setIsOpen={setIsCashModalOpen}
        className="max-w-[440px] bg-obsidian-900 border-white/5 text-white p-0 overflow-hidden"
        title={
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow-emerald/10 mb-3">
              <Fingerprint size={24} />
            </div>
            <span className="text-xl lg:text-2xl font-black font-heading italic tracking-tight uppercase leading-none block">{t('settlementProto')}</span>
          </div>
        }
        description={
          <span className="text-white/30 tracking-[0.2em] uppercase mt-1 text-[8px] font-bold block">
            {t('finalizingReconciliation')} {selectedBill?.user_id?.split('-')[0].toUpperCase()}
          </span>
        }
      >
          <div className="flex flex-col h-full overflow-hidden">

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
                      <p className="text-2xl font-black italic text-emerald-400 tracking-tighter leading-none">₹{formatCurrency(selectedBill.total_amount || 0, locale)}</p>
                    </div>
                  </div>

                  {selectedBill.utr_reference && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                      <p className="text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] italic">Submitted UTR Reference</p>
                      <p className="text-sm font-mono font-bold text-white tracking-widest">{selectedBill.utr_reference}</p>
                      <p className="text-[7px] text-white/20 italic">Submitted on {new Date(selectedBill.utr_submitted_at!).toLocaleString()}</p>
                    </div>
                  )}

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
      </ResponsiveDialog>
    </div>
  )
}

function PdfDownloadButton({ bill }: { bill: Bill }) {
  const t = useTranslations("Admin.bills")
  const tCommon = useTranslations("Common")
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
        aria-label={tCommon('accessibility.downloadInvoice')}
      >
        <FileText size={14} aria-hidden="true" /> {t('logPdf').toUpperCase()}
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
