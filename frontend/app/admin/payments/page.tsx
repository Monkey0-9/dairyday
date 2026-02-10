"use client"

import { useState, useEffect } from "react"
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
  Clock
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, paymentsApi } from "@/lib/api"

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
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  // Cash Payment Modal state
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [paymentNotes, setPaymentNotes] = useState("")

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
      setPaymentNotes("")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to record payment")
    },
  })

  const openCashModal = (bill: Bill) => {
    setSelectedBill(bill)
    setPaymentMethod("CASH")
    setPaymentDate(format(new Date(), "yyyy-MM-dd"))
    setPaymentNotes("")
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

  // Sort bills: UNPAID first, then by amount descending
  const sortedBills = [...filteredBills].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "UNPAID" ? -1 : 1
    }
    return b.total_amount - a.total_amount
  })

  const getPaymentMethodIcon = (method?: string) => {
    switch (method?.toUpperCase()) {
      case "CASH": return <Banknote className="h-3 w-3" />
      case "BANK_TRANSFER": return <Building2 className="h-3 w-3" />
      case "RAZORPAY": return <CreditCard className="h-3 w-3" />
      default: return <CreditCard className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments & Billing</h1>
          <p className="text-muted-foreground">Track payments, record cash collections, manage dues.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[180px]"
          />
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">Collected</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              ₹{data?.summary.paid_total?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              {data?.summary.paid_count || 0} customers paid
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Pending Due</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              ₹{data?.summary.unpaid_total?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {data?.summary.unpaid_count || 0} customers pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <IndianRupee className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{((data?.summary.paid_total || 0) + (data?.summary.unpaid_total || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.summary.total_bills || 0} bills generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data?.summary.total_bills
                ? Math.round((data.summary.paid_count / data.summary.total_bills) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of customers have paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <CardTitle>Customer Bills</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="UNPAID">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-red-500 rounded-full" /> Pending
                    </span>
                  </SelectItem>
                  <SelectItem value="PAID">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full" /> Paid
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800">
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="font-bold">ID</TableHead>
                  <TableHead className="font-bold">Month</TableHead>
                  <TableHead className="text-right font-bold">Liters</TableHead>
                  <TableHead className="text-right font-bold">Amount</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No bills found for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBills.map((bill) => (
                    <TableRow
                      key={bill.id}
                      className={bill.status === "UNPAID" ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell className="font-medium">{bill.user_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {bill.user_id.split("-")[0].toUpperCase()}
                      </TableCell>
                      <TableCell>{bill.month}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {bill.total_liters.toFixed(1)} L
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        ₹{bill.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {bill.status === "PAID" ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            PAID
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 gap-1">
                            <Clock className="h-3 w-3" />
                            DUE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {bill.status === "UNPAID" ? (
                          <Button
                            size="sm"
                            onClick={() => openCashModal(bill)}
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          >
                            <Banknote className="h-3 w-3" />
                            Record Payment
                          </Button>
                        ) : (
                          <span className="text-green-600 text-xs flex items-center justify-end gap-1">
                            {getPaymentMethodIcon(bill.payment_method)}
                            {bill.payment_method === "CASH" ? "Cash" : "Online"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cash Payment Recording Modal */}
      <Dialog open={cashModalOpen} onOpenChange={setCashModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Record Cash Payment
            </DialogTitle>
            <DialogDescription>
              Record an offline/cash payment for this customer.
            </DialogDescription>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-4 py-4">
              {/* Customer Info */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedBill.user_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer ID</span>
                  <span className="font-mono text-xs">{selectedBill.user_id.split("-")[0].toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Month</span>
                  <span>{selectedBill.month}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Liters</span>
                  <span>{selectedBill.total_liters.toFixed(1)} L</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-700" />
                <div className="flex justify-between">
                  <span className="font-bold">Amount Due</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{selectedBill.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> Cash
                      </span>
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Bank Transfer
                      </span>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Other
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCashModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={markPaidMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              {markPaidMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
