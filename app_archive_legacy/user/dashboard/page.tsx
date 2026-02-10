"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useRouter } from "next/navigation"
import { 
  Loader2, Download, Calendar, Droplet, LogOut, CreditCard,
  CheckCircle, AlertCircle, Clock, Info, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton, SkeletonCard, SkeletonInline } from "@/components/skeleton"
import { cn, formatCurrency, formatDate, getRelativeTime, getInitials } from "@/lib/utils"
import { toast } from "sonner"

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ConsumptionData {
  date: string
  quantity: number
}

interface BillData {
  id: string
  total_amount: number
  status: "PAID" | "DUE" | "OVERDUE"
  due_date?: string
  paid_at?: string
  pdf_url?: string
}

export default function UserDashboard() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const router = useRouter()
  const queryClient = useQueryClient()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const user_id = typeof window !== "undefined" ? localStorage.getItem("user_id") : null

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      router.push("/user/login")
    }
  }, [token, router])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_role")
    router.push("/user/login")
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, m] = month.split("-").map(Number)
    let newMonth: number
    let newYear = year
    
    if (direction === 'prev') {
      newMonth = m - 1
      if (newMonth < 1) {
        newMonth = 12
        newYear -= 1
      }
    } else {
      newMonth = m + 1
      if (newMonth > 12) {
        newMonth = 1
        newYear += 1
      }
    }
    
    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, "0")}`
    setMonth(newMonthStr)
  }

  // Fetch consumption data
  const { data: consumption, isLoading: loadingConsumption } = useQuery({
    queryKey: ["consumption", user_id, month],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/consumption/mine?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return res.data as ConsumptionData[]
    },
    enabled: !!token && !!user_id
  })

  // Fetch bill data
  const { data: bill, isLoading: loadingBill } = useQuery({
    queryKey: ["bill", user_id, month],
    queryFn: async () => {
      if (!user_id) return null
      try {
        const res = await axios.get(`${API_URL}/bills/${user_id}/${month}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return res.data as BillData
      } catch { return null }
    },
    enabled: !!user_id && !!token
  })

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalLiters = consumption?.reduce((acc, curr) => acc + curr.quantity, 0) || 0
    const daysWithDelivery = consumption?.filter(c => c.quantity > 0).length || 0
    const avgLiters = daysWithDelivery > 0 ? totalLiters / daysWithDelivery : 0
    return { totalLiters, daysWithDelivery, avgLiters }
  }, [consumption])

  // Loading skeleton
  if (loadingConsumption || loadingBill) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Month selector skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Bill card skeleton */}
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <Skeleton className="h-8 w-24 mx-auto" />
                <Skeleton className="h-16 w-48 mx-auto" />
                <Skeleton className="h-6 w-36 mx-auto" />
                <Skeleton className="h-14 w-full max-w-md mx-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-20 mx-auto mb-2" />
                <Skeleton className="h-8 w-24 mx-auto" />
              </Card>
            ))}
          </div>

          {/* Table skeleton */}
          <Card className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Payment handler
  const handlePayment = async () => {
    if (!bill?.id) return

    try {
      toast.loading("Preparing payment...", { id: "payment" })
      const res = await fetch(`${API_URL}/payments/create-order/${bill.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) throw new Error("Failed to create order")
      const data = await res.json()

      toast.dismiss("payment")

      if (window.Razorpay) {
        const options = {
          key: data.key_id || "rzp_test_KEY_ID",
          amount: data.amount,
          currency: data.currency,
          name: "Dairy Payment",
          description: `Bill for ${month}`,
          order_id: data.id,
          handler: () => {
            toast.success("Payment successful!", {
              description: "Your bill has been marked as paid"
            })
            queryClient.invalidateQueries({ queryKey: ["bill"] })
          },
          prefill: {
            name: "Customer",
          },
          theme: { color: "#22c55e" },
        }
        new window.Razorpay(options).open()
      }
    } catch (error) {
      toast.error("Payment failed", {
        description: "Please try again or contact support"
      })
    }
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: BillData['status'] }) => {
    const config = {
      PAID: {
        icon: CheckCircle,
        className: "bg-green-100 text-green-700 border-green-200",
        label: "PAID"
      },
      DUE: {
        icon: AlertCircle,
        className: "bg-orange-100 text-orange-700 border-orange-200",
        label: "DUE"
      },
      OVERDUE: {
        icon: Clock,
        className: "bg-red-100 text-red-700 border-red-200",
        label: "OVERDUE"
      }
    }

    const { icon: Icon, className, label } = config[status]

    return (
      <Badge className={cn("px-4 py-2 text-sm font-bold border-2 shadow-sm", className)}>
        <Icon className="h-4 w-4 mr-1.5" />
        {label}
      </Badge>
    )
  }

  // Bill card hero section
  const BillHero = () => {
    if (!bill) {
      return (
        <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bill Generated</h3>
            <p className="text-gray-500">
              Bill for {new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })} 
              {" "}will be generated soon.
            </p>
          </CardContent>
        </Card>
      )
    }

    const isPaid = bill.status === "PAID"

    return (
      <Card className={cn(
        "border-2 shadow-lg overflow-hidden",
        isPaid 
          ? "border-green-200 bg-gradient-to-br from-green-50 to-white" 
          : bill.status === "OVERDUE"
            ? "border-red-200 bg-gradient-to-br from-red-50 to-white"
            : "border-orange-200 bg-gradient-to-br from-orange-50 to-white"
      )}>
        {/* Status bar */}
        <div className={cn(
          "px-6 py-3 flex items-center justify-between",
          isPaid ? "bg-green-100" : bill.status === "OVERDUE" ? "bg-red-100" : "bg-orange-100"
        )}>
          <StatusBadge status={bill.status} />
          {bill.due_date && !isPaid && (
            <span className={cn(
              "text-sm font-medium flex items-center gap-1",
              bill.status === "OVERDUE" ? "text-red-700" : "text-orange-700"
            )}>
              <Clock className="h-4 w-4" />
              Due: {formatDate(bill.due_date)}
            </span>
          )}
          {isPaid && bill.paid_at && (
            <span className="text-sm text-green-700 font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Paid {getRelativeTime(bill.paid_at)}
            </span>
          )}
        </div>

        <CardContent className="pt-8 pb-6">
          <div className="text-center space-y-6">
            {/* Amount - HUGE */}
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {isPaid ? "Amount Paid" : "Amount Due"}
              </p>
              <p className={cn(
                "text-5xl md:text-6xl font-black tracking-tight mt-2",
                isPaid ? "text-green-700" : bill.status === "OVERDUE" ? "text-red-700" : "text-orange-700"
              )}>
                {formatCurrency(Number(bill.total_amount))}
              </p>
            </div>

            {/* Liters metric */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-gray-200 shadow-sm">
              <Droplet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-gray-900">
                {metrics.totalLiters.toFixed(1)} liters this month
              </span>
            </div>

            {/* Pay button - HUGE & PROMINENT */}
            {!isPaid && (
              <Button
                onClick={handlePayment}
                size="lg"
                className={cn(
                  "w-full sm:w-auto h-16 text-xl font-bold rounded-xl shadow-lg",
                  "bg-green-600 hover:bg-green-700 text-white",
                  "ring-2 ring-green-400 ring-offset-2",
                  "transition-all hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                <CreditCard className="h-6 w-6 mr-3" />
                Pay {formatCurrency(Number(bill.total_amount))}
              </Button>
            )}

            {/* Paid confirmation */}
            {isPaid && (
              <div className="bg-green-100 rounded-lg p-4">
                <p className="text-green-800 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Thank you! Your payment has been received.
                </p>
                {bill.paid_at && (
                  <p className="text-green-600 text-sm text-center mt-1">
                    Receipt date: {formatDate(bill.paid_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>

        {/* Trust signals footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Secure payment via Razorpay</span>
          </div>
          {bill.pdf_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(bill.pdf_url, "_blank")}
              className="text-primary hover:text-primary/80"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
          )}
        </div>
      </Card>
    )
  }

  // Metric card component
  const MetricCard = ({ 
    label, 
    value, 
    unit,
    icon: Icon,
    className 
  }: { 
    label: string
    value: string | number
    unit?: string
    icon: any
    className?: string
  }) => (
    <Card className={cn("p-4 text-center shadow-sm", className)}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-lg font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </Card>
  )

  const monthDisplay = new Date(month + "-01").toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <Droplet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-sm text-gray-600">Milk & Bills</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{monthDisplay}</h2>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-2 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value)
                  queryClient.invalidateQueries({ queryKey: ["consumption"] })
                  queryClient.invalidateQueries({ queryKey: ["bill"] })
                }}
                className="border-none focus:ring-0 text-sm font-semibold bg-transparent text-gray-900 w-28"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              disabled={month >= new Date().toISOString().slice(0, 7)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bill Hero Card - Most Important */}
        <BillHero />

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total Liters"
            value={metrics.totalLiters.toFixed(1)}
            unit="L"
            icon={Droplet}
            className="border-blue-200 bg-blue-50"
          />
          <MetricCard
            label="Days Delivered"
            value={metrics.daysWithDelivery}
            icon={Calendar}
          />
          <MetricCard
            label="Daily Average"
            value={metrics.avgLiters.toFixed(1)}
            unit="L"
            icon={Droplet}
            className="border-purple-200 bg-purple-50"
          />
        </div>

        {/* Milk History Table */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">Daily Milk Record</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {consumption && consumption.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700">Day</th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700">Liters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...consumption].reverse().map((c) => {
                      const date = new Date(c.date)
                      return (
                        <tr key={c.date} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">
                            {date.toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short"
                            })}
                          </td>
                          <td className="py-4 px-4 text-right text-gray-500">
                            {date.toLocaleDateString("en-IN", { weekday: "short" })}
                          </td>
                          <td className={cn(
                            "py-4 px-4 text-right font-bold",
                            c.quantity > 0 ? "text-gray-900" : "text-gray-400"
                          )}>
                            {c.quantity > 0 ? `${c.quantity} L` : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="py-4 px-4 font-bold text-gray-900">Total</td>
                      <td className="py-4 px-4"></td>
                      <td className="py-4 px-4 text-right font-bold text-primary text-lg">
                        {metrics.totalLiters.toFixed(2)} L
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Droplet className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No milk records for this month</p>
                <p className="text-sm text-gray-400 mt-1">Your daily entries will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help / Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Need Help?</h4>
                <p className="text-sm text-blue-700">
                  If you have any questions about your bill or delivery, please contact your dairy operator.
                  For payment issues, reach out to support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8 bg-white">
        <p className="text-center text-sm text-gray-500 font-medium">
          © {new Date().getFullYear()} DairyOS
        </p>
      </footer>
    </div>
  )
}

