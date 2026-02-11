"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  IndianRupee,
  Banknote,
  Building2,
  Clock,
  RefreshCw,
  ArrowUpRight,
  Filter,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"

import { useTranslation } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, paymentsApi } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Bill {
  id: string
  user_id: string
  user_name: string
  month: string
  total_liters: number
  total_amount: number
  status: "PAID" | "UNPAID"
  pdf_url: string | null
  created_at: string
  payment_method?: string
  paid_at?: string
}

interface PaymentSummary {
  month: string
  total_bills: number
  paid_count: number
  unpaid_count: number
  paid_total: number
  unpaid_total: number
}

interface DashboardData {
  bills: Bill[]
  summary: PaymentSummary
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  // Cash Payment Modal state
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  
  // We'll simplify the payment method for now to focus on the UI
  const [paymentMethod, setPaymentMethod] = useState("CASH")

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["payments-dashboard", month],
    queryFn: async () => {
      const res = await adminApi.getPaymentsDashboard(month)
      return res.data
    },
    staleTime: 30_000,
  })

  const markPaidMutation = useMutation({
    mutationFn: async (billId: string) => {
      return paymentsApi.markPaid(billId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments-dashboard", month] })
      toast.success("Payment recorded successfully")
      setCashModalOpen(false)
      setSelectedBill(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to record payment")
    },
  })

  const openCashModal = (bill: Bill) => {
    setSelectedBill(bill)
    setPaymentMethod("CASH")
    setCashModalOpen(true)
  }

  const handleRecordPayment = () => {
    if (selectedBill) {
      markPaidMutation.mutate(selectedBill.id)
    }
  }

  const filteredBills = data?.bills.filter(bill => {
    const matchesStatus = filterStatus === "ALL" || bill.status === filterStatus
    const matchesSearch =
      bill.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.total_amount.toString().includes(searchTerm)
    return matchesStatus && matchesSearch
  }) || []

  const sortedBills = [...filteredBills].sort((a, b) => {
    if (a.status !== b.status) return a.status === "UNPAID" ? -1 : 1
    return b.total_amount - a.total_amount
  })

  // Export to CSV
  const handleExport = () => {
    if (!sortedBills.length) return toast.error("No data to export")
    
    const headers = ["ID", "Customer", "Customer ID", "Month", "Liters", "Amount", "Status"]
    const rows = sortedBills.map((b) => [
      b.id,
      b.user_name,
      b.user_id,
      b.month,
      b.total_liters,
      b.total_amount,
      b.status
    ])
    
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payments-${month}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{t('payments')}</h1>
          <div className="flex items-center gap-2 text-neutral-400">
             <p>{t('manageCustomers')}</p>
             <span className="hidden md:inline">•</span>
             <span className="text-xs flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                Updated just now
             </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[180px] bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-indigo-500/50"
          />
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            disabled={isLoading}
            className="h-12 w-12 p-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </Button>

          <Button
            variant="outline"
            onClick={handleExport}
            className="h-12 w-12 p-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300"
            title="Export CSV"
          >
            <ArrowRight className="h-5 w-5 -rotate-45" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
            label={t('amountPaid')}
            value={`₹${data?.summary.paid_total?.toLocaleString() || "0"}`}
            icon={CheckCircle2}
            accentColor="text-emerald-400"
            subtext={`${data?.summary.paid_count || 0} paid`}
            loading={isLoading}
        />
        <StatsCard
            label={t('pendingDues')}
            value={`₹${data?.summary.unpaid_total?.toLocaleString() || "0"}`}
            icon={AlertCircle}
            accentColor="text-rose-500"
            subtext={`${data?.summary.unpaid_count || 0} pending`}
            loading={isLoading}
        />
        <StatsCard
            label={t('total')}
            value={`₹${((data?.summary.paid_total || 0) + (data?.summary.unpaid_total || 0)).toLocaleString()}`}
            icon={IndianRupee}
            loading={isLoading}
            subtext={`${data?.summary.total_bills || 0} bills`}
        />
        <StatsCard
            label={t('collectionRate')}
            value={`${data?.summary.total_bills ? Math.round((data.summary.paid_count / data.summary.total_bills) * 100) : 0}%`}
            icon={CreditCard}
            loading={isLoading}
            trend="Monthly"
        />
      </div>

      {/* Bills Table */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-semibold text-white">{t('allCustomers')}</h2>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input
                        placeholder={t('searchCustomers')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/5 border-white/10 text-white pl-10 h-10 rounded-lg focus:bg-white/10"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[150px] bg-white/5 border-white/10 text-white h-10 rounded-lg">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 text-white">
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="UNPAID">Pending</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-white/[0.08] hover:bg-transparent">
                        <TableHead className="text-neutral-500 font-medium py-5 px-6">{t('name')}</TableHead>
                        <TableHead className="text-neutral-500 font-medium">{t('selectMonth')}</TableHead>
                        <TableHead className="text-right text-neutral-500 font-medium">{t('litersLabel')}</TableHead>
                        <TableHead className="text-right text-neutral-500 font-medium">{t('total')}</TableHead>
                        <TableHead className="text-center text-neutral-500 font-medium">{t('status')}</TableHead>
                        <TableHead className="text-right text-neutral-500 font-medium px-6">{t('action')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         [...Array(5)].map((_, i) => (
                             <TableRow key={i} className="border-white/[0.05]">
                                <TableCell className="px-6"><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 ml-auto bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 ml-auto bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-24 ml-auto bg-white/10" /></TableCell>
                             </TableRow>
                         ))
                    ) : sortedBills.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-48 text-center text-neutral-500">
                                No bills found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedBills.map((bill) => (
                            <TableRow 
                                key={bill.id}
                                className="border-white/[0.05] hover:bg-white/[0.04] transition-colors group odd:bg-white/[0.01]"
                            >
                                <TableCell className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white text-base">
                                            {bill.user_name}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">
                                            ID: {bill.user_id.split("-")[0]}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-neutral-400 font-mono text-sm">{bill.month}</TableCell>
                                <TableCell className="text-right font-mono text-neutral-300">
                                    {bill.total_liters.toFixed(1)} L
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="font-bold text-white tabular-nums text-lg">
                                        ₹{bill.total_amount.toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge status={bill.status} />
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    {bill.status === "UNPAID" ? (
                                        <Button
                                            size="sm"
                                            onClick={() => openCashModal(bill)}
                                            className="h-8 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                        >
                                            <Banknote className="h-3.5 w-3.5 mr-1.5" />
                                            Record
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-500">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span className="font-medium">Paid</span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {/* Cash Payment Modal */}
      <Dialog open={cashModalOpen} onOpenChange={setCashModalOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
           <DialogHeader>
             <DialogTitle>{t('recordPayment')}</DialogTitle>
             <DialogDescription className="text-neutral-400">
               Confirm payment receipt for {selectedBill?.user_name}.
             </DialogDescription>
           </DialogHeader>

           {selectedBill && (
             <div className="space-y-4 my-2">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Amount</span>
                    <span className="text-3xl font-bold text-white">₹{selectedBill.total_amount.toLocaleString()}</span>
                </div>
                
                <p className="text-sm text-center text-neutral-500">
                    Marking as paid via Cash/Manual collection.
                </p>
             </div>
           )}

           <DialogFooter className="gap-2 sm:gap-0">
             <Button variant="ghost" onClick={() => setCashModalOpen(false)} className="text-neutral-400 hover:text-white">Cancel</Button>
             <Button 
               onClick={handleRecordPayment}
               disabled={markPaidMutation.isPending}
               className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto"
             >
               {markPaidMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
               {t('confirmPaid')}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsCard({ label, value, loading, icon: Icon, accentColor, subtext, trend }: any) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between min-h-[140px] hover:bg-white/[0.07] transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2.5 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-colors", accentColor && `group-hover:${accentColor}`)}>
                    <Icon className="h-5 w-5" />
                </div>
                {trend && <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-neutral-400">{trend}</span>}
            </div>
            <div>
                <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-1">{label}</h3>
                {loading ? (
                    <Skeleton className="h-8 w-24 bg-white/10" />
                ) : (
                    <div className={cn("text-3xl font-light text-white", accentColor)}>{value}</div>
                )}
                {subtext && <p className="text-xs text-neutral-500 mt-2">{subtext}</p>}
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const isPaid = status === "PAID"
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            isPaid 
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
              : "bg-rose-500/5 border-rose-500/20 text-rose-500"
        )}>
            {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {status}
        </span>
    )
}
