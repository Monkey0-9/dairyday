"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Loader2,
  Receipt,
  Search,
  FileText,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Milk,
  IndianRupee,
  FileCheck,
  Banknote,
  Filter,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  const [searchTerm, setSearchTerm] = useState("")
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false)
  
  // For Recording Cash Payment
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)

  const { data: bills = [], isLoading } = useQuery({
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
      // Invalidate all related queries
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      queryClient.invalidateQueries({ queryKey: ["bills"] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["consumption"] })
      queryClient.invalidateQueries({ queryKey: ["consumption-grid"] })
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
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
      // Invalidate all related queries for data consistency
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      queryClient.invalidateQueries({ queryKey: ["bills"] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["consumption"] })
      queryClient.invalidateQueries({ queryKey: ["consumption-grid"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      
      toast.success("Payment recorded and user account updated")
      setIsCashModalOpen(false)
      setSelectedBill(null)
    },
    onError: (error: any) => {
      toast.error(formatApiError(error))
    }
  })


  // Calculations with safe number cast
  const totalLiters = bills.reduce((acc: number, bill: any) => acc + Number(bill.total_liters || 0), 0)
  const totalAmount = bills.reduce((acc: number, bill: any) => acc + Number(bill.total_amount || 0), 0)
  const paidCount = bills.filter((b: any) => b.status === "PAID").length
  const unpaidCount = bills.filter((b: any) => b.status === "UNPAID").length
  const unpaidAmount = bills
    .filter((b: any) => b.status === "UNPAID")
    .reduce((acc: number, b: any) => acc + Number(b.total_amount || 0), 0)

  const filteredBills = bills.filter((bill: any) => {
    const matchesSearch = 
      bill.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(bill.id).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = !showOnlyUnpaid || bill.status === "UNPAID"
    
    return matchesSearch && matchesFilter
  })

  // Sort: Unpaid first, then amount descending
  const sortedBills = [...filteredBills].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "UNPAID" ? -1 : 1
    }
    return Number(b.total_amount) - Number(a.total_amount)
  })

  const handleRecordCash = (bill: any) => {
    setSelectedBill(bill)
    setIsCashModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Billing Management
          </h1>
          <p className="text-muted-foreground">Manage dues, record cash payments, and generate monthly reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[180px] h-10 shadow-sm"
          />
            <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 font-bold"
          >
            {generateAllMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Bills for Unpaid
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Bills"
          value={bills.length}
          icon={<Receipt className="h-5 w-5" />}
          gradient="from-blue-500 to-indigo-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Liters"
          value={`${totalLiters.toFixed(1)} L`}
          icon={<Milk className="h-5 w-5" />}
          gradient="from-violet-500 to-fuchsia-500"
          loading={isLoading}
        />
        <StatCard
          title="Pending Dues"
          value={`₹${unpaidAmount.toLocaleString()}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          gradient="from-orange-500 to-red-500"
          loading={isLoading}
          subtext={`${unpaidCount} bills to collect`}
        />
        <StatCard
          title="Collection Rate"
          value={bills.length > 0 ? `${Math.round((paidCount / bills.length) * 100)}%` : "0%"}
          icon={<CheckCircle2 className="h-5 w-5" />}
          gradient="from-emerald-500 to-teal-500"
          loading={isLoading}
          subtext={`${paidCount} bills cleared`}
        />
      </div>

      {/* Bills Table Section */}
      <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Ledger: {format(new Date(month + "-01"), "MMMM yyyy")}</CardTitle>
              <CardDescription>Search by name to verify current status or record offline payments.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Find customer by name..."
                  className="pl-10 h-10 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant={showOnlyUnpaid ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
                className={cn(
                  "h-10 px-4 rounded-xl gap-2",
                  showOnlyUnpaid && "bg-orange-500 hover:bg-orange-600 border-none"
                )}
              >
                <Filter className="h-4 w-4" />
                {showOnlyUnpaid ? "Showing Unpaid" : "All Bills"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border overflow-hidden bg-white dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-transparent">
                  <TableHead className="font-bold py-4 px-6">Customer & ID</TableHead>
                  <TableHead className="text-right font-bold py-4">Total Consumed</TableHead>
                  <TableHead className="text-right font-bold py-4">Bill Amount</TableHead>
                  <TableHead className="font-bold py-4 text-center">Status</TableHead>
                  <TableHead className="text-right font-bold py-4 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-6"><Skeleton className="h-10 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-16 mx-auto rounded-full" /></TableCell>
                      <TableCell className="px-6"><Skeleton className="h-10 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                          <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          {searchTerm ? `No results for "${searchTerm}"` : "No bills generated for this month."}
                        </p>
                        {searchTerm && (
                          <Button variant="link" onClick={() => setSearchTerm("")}>Clear search</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBills.map((bill: any) => (
                    <TableRow key={bill.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="py-4 px-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {bill.user_name || "Guest Customer"}
                            </p>
                            {bill.is_locked && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-500">
                                Locked
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-400">ID: {bill.user_id?.split('-')[0].toUpperCase()}</p>

                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-slate-600 dark:text-slate-400">
                        {Number(bill.total_liters || 0).toFixed(1)} L
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="inline-flex flex-col items-end">
                           <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                             ₹{Number(bill.total_amount || 0).toLocaleString()}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all shadow-sm",
                            bill.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          )}
                        >
                          {bill.status === "PAID" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {bill.status === "UNPAID" && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 h-8 gap-1.5"
                              onClick={() => handleRecordCash(bill)}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Pay in Cash
                            </Button>
                          )}
                          <PdfDownloadButton bill={bill} />
                        </div>
                        {/* Always show "Pay Now" on mobile or when not hovered if unpaid */}
                        <div className="group-hover:hidden">
                           {bill.status === "UNPAID" ? (
                             <span className="text-rose-500 text-xs font-bold flex items-center justify-end gap-1">
                               Due <ArrowRight className="h-3 w-3" />
                             </span>
                           ) : (
                             <span className="text-emerald-500 text-xs font-bold">Cleared</span>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cash Modal */}
      <Dialog open={isCashModalOpen} onOpenChange={setIsCashModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <Banknote className="h-5 w-5 text-emerald-600" />
               Record Cash Payment
            </DialogTitle>
            <DialogDescription>
              Marking this bill as paid will reflect immediately in the customer's dashboard.
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
             <div className="py-6 space-y-4">
               <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</p>
                    <p className="font-bold">{selectedBill.user_name || "Guest Customer"}</p>
                    <p className="text-[10px] font-mono text-slate-400">ID: {selectedBill.user_id?.split('-')[0].toUpperCase()}</p>
                  </div>
                 <div className="text-right">
                   <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</p>
                   <p className="text-xl font-black text-emerald-600">₹{selectedBill.total_amount}</p>
                 </div>
               </div>
               
               <p className="text-sm text-muted-foreground italic text-center">
                 "Admin manually collecting cash for {selectedBill.month} bill."
               </p>
             </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCashModalOpen(false)}>Cancel</Button>
            <Button 
               className="bg-emerald-600 hover:bg-emerald-700" 
               onClick={() => markPaidMutation.mutate({ 
                 billId: selectedBill.id, 
                 method: "CASH", 
                 notes: "Cash collection by Admin" 
               })}
               disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, icon, gradient, loading, subtext }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  loading: boolean;
  subtext?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-none shadow-premium transition-all duration-300 hover:scale-[1.02]">
      <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", gradient)} />
      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg text-white", gradient)}>
            {icon}
          </div>
          {subtext && !loading && (
            <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {subtext}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <p className="text-3xl font-black tracking-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
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

  // If bill already has URL from list or has polled URL
  const pdfUrl = bill.pdf_url || statusData?.pdf_url

  if (pdfUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(pdfUrl, '_blank')}
        className="h-8 gap-1.5 rounded-lg border-slate-200"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
    )
  }

  // If locked but no URL, check status
  if (bill.is_locked) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 gap-1.5 rounded-lg border-slate-200 opacity-70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {isLoading || statusData?.status === "queued" ? "Generating..." : "Processing"}
      </Button>
    )
  }

  // Fallback (Unlocked/Draft)
  return <span className="text-xs text-muted-foreground">-</span>
}
