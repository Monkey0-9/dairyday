"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Loader2,
  Receipt,
  Search,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Milk,

  Filter,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

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

import { Skeleton } from "@/components/ui/skeleton"
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


export default function AdminBillsPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false)
  
  // For Recording Cash Payment
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)

  const { data: bills = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-bills", month],
    queryFn: async () => {
      const res = await billsApi.list(month)
      return res.data
    },
    staleTime: 30_000,
  })

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await billsApi.generateAll(month)
      return res.data
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Bills generated successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (error: any) => {
      toast.error(formatApiError(error))
    }
  })


  const markPaidMutation = useMutation({
    mutationFn: async ({ billId, method, notes }: { billId: string, method: string, notes: string }) => {
      return paymentsApi.markPaid(billId, method, notes)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Payment recorded")
      setIsCashModalOpen(false)
      setSelectedBill(null)
    },
    onError: (error: any) => {
      toast.error(formatApiError(error))
    }
  })


  // Calculations
  const totalLiters = bills.reduce((acc: number, bill: any) => acc + Number(bill.total_liters || 0), 0)
  const paidCount = bills.filter((b: any) => b.status === "PAID").length
  const unpaidCount = bills.filter((b: any) => b.status === "UNPAID").length
  const unpaidAmount = bills
    .filter((b: any) => b.status === "UNPAID")
    .reduce((acc: number, b: any) => acc + Number(b.total_amount || 0), 0)

  // Filter & Sort
  const filteredBills = bills.filter((bill: any) => {
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

  const handleRecordCash = (bill: any) => {
    setSelectedBill(bill)
    setIsCashModalOpen(true)
  }

  // Export to CSV
  const handleExport = () => {
    if (!sortedBills.length) return toast.error("No data to export")
    
    const headers = ["ID", "Customer", "Customer ID", "Month", "Liters", "Amount", "Status"]
    const rows = sortedBills.map((b: any) => [
      b.id,
      b.user_name,
      b.user_id,
      b.month,
      b.total_liters,
      b.total_amount,
      b.status
    ])
    
    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bills-${month}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8 space-y-8 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
            {t('billingManagement')}
          </h1>
          <div className="flex items-center gap-2 text-neutral-400">
             <p>{t('manageCustomers')}</p>
             <span className="hidden md:inline">•</span>
             <span className="text-xs flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                Updated just now
             </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Input
             type="month"
             value={month}
             onChange={(e) => setMonth(e.target.value)}
             className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-indigo-500/50 w-[160px]"
          />
          
          <Button
            variant="outline"
            onClick={() => refetch()}
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
          
          <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105"
          >

            {generateAllMutation.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {t('generateBills')}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            label={t('totalBills')} 
            value={bills.length} 
            loading={isLoading}
            icon={Receipt}
            trend="10% increase" // Placeholder trend
         />
         <StatsCard 
            label={t('totalMilk')} 
            value={`${totalLiters.toFixed(1)} L`} 
            loading={isLoading}
            icon={Milk}
            accentColor="text-indigo-400"
         />
         <StatsCard 
            label={t('pendingDues')} 
            value={`₹${unpaidAmount.toLocaleString()}`} 
            loading={isLoading}
            icon={AlertTriangle}
            accentColor="text-rose-500"
            subtext={`${unpaidCount} bills unpaid`}
         />
         <StatsCard 
            label={t('collectionRate')} 
            value={bills.length > 0 ? `${Math.round((paidCount / bills.length) * 100)}%` : "0%"} 
            loading={isLoading}
            icon={CheckCircle2}
            accentColor="text-emerald-500"
         />
      </div>

      {/* Ledger Table */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-semibold text-white">{t('ledger')}: {format(new Date(month), 'MMMM yyyy')}</h2>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input 
                        placeholder="Search customers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/5 border-white/10 text-white pl-10 h-10 rounded-lg focus:bg-white/10 transition-all"
                    />
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
                    className={cn(
                        "h-10 border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300",
                        showOnlyUnpaid && "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    {showOnlyUnpaid ? "Unpaid Only" : "All Status"}
                </Button>
            </div>
        </div>

        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-white/[0.08] hover:bg-transparent">
                         <TableHead className="text-neutral-500 font-medium py-5 px-6">{t('customers')}</TableHead>
                         <TableHead className="text-right text-neutral-500 font-medium">{t('consumption')}</TableHead>
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
                                <TableCell><Skeleton className="h-4 w-16 ml-auto bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 ml-auto bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full bg-white/10" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-24 ml-auto bg-white/10" /></TableCell>
                             </TableRow>
                        ))
                    ) : sortedBills.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center text-neutral-500">
                                No bills found matching your criteria.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedBills.map((bill: any) => (
                            <TableRow 
                                key={bill.id} 
                                className="border-white/[0.05] hover:bg-white/[0.04] transition-colors group odd:bg-white/[0.01]"
                            >
                                <TableCell className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white text-base">
                                            {bill.user_name || "Guest"}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">
                                            ID: {bill.user_id?.split('-')[0]}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-neutral-300">
                                    {Number(bill.total_liters).toFixed(1)} L
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="font-bold text-white tabular-nums text-lg">
                                        ₹{Number(bill.total_amount).toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge status={bill.status} />
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {bill.status === "UNPAID" && (
                                            <Button 
                                                size="sm"
                                                onClick={() => handleRecordCash(bill)}
                                                className="h-8 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                                            >
                                                Pay
                                            </Button>
                                        )}
                                        <PdfDownloadButton bill={bill} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {/* Cash Modal */}
      <Dialog open={isCashModalOpen} onOpenChange={setIsCashModalOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('recordPayment')}</DialogTitle>
                <DialogDescription className="text-neutral-400">
                    Confirm cash payment from {selectedBill?.user_name}.
                </DialogDescription>
            </DialogHeader>
            
            {selectedBill && (
                <div className="bg-white/5 rounded-xl p-4 space-y-3 my-2 border border-white/5">
                     <div className="flex justify-between">
                        <span className="text-neutral-400">Amount Due</span>
                        <span className="text-xl font-bold text-emerald-400">₹{selectedBill.total_amount}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Customer ID</span>
                        <span className="font-mono">{selectedBill.user_id.split('-')[0]}</span>
                     </div>
                </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsCashModalOpen(false)} className="text-neutral-400 hover:text-white">Cancel</Button>
                <Button 
                    onClick={() => markPaidMutation.mutate({ 
                        billId: selectedBill.id, 
                        method: "CASH", 
                        notes: "Admin Manual Collection" 
                    })}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                    Confirm Paid
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsCard({ label, value, loading, icon: Icon, accentColor, subtext }: any) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between min-h-[140px] hover:bg-white/[0.07] transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2.5 rounded-lg bg-white/5 text-neutral-400 group-hover:text-white transition-colors", accentColor && `group-hover:${accentColor}`)}>
                    <Icon className="h-5 w-5" />
                </div>
                {subtext && <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-neutral-400">{subtext}</span>}
            </div>
            <div>
                <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-1">{label}</h3>
                {loading ? (
                    <Skeleton className="h-8 w-24 bg-white/10" />
                ) : (
                    <div className={cn("text-3xl font-light text-white", accentColor)}>{value}</div>
                )}
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

function PdfDownloadButton({ bill }: { bill: any }) {
    const { data: statusData, isLoading } = useQuery({
      queryKey: ["pdf-status", bill.id],
      queryFn: async () => {
        const res = await billsApi.getPdfStatus(bill.id)
        return res.data
      },
      enabled: !!bill.is_locked && !bill.pdf_url,
      refetchInterval: (data: any) => data?.status === "completed" ? false : 5000,
    })
  
    const pdfUrl = bill.pdf_url || statusData?.pdf_url
  
    if (pdfUrl) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(pdfUrl, '_blank')}
          className="h-8 w-8 p-0 rounded-full border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white"
        >
          <FileText className="h-3.5 w-3.5" />
        </Button>
      )
    }
  
    if (bill.is_locked) {
      return (
        <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0 rounded-full border-white/10 opacity-50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </Button>
      )
    }
  
    return null
}
