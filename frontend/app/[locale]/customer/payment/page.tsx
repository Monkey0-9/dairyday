"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Shield,
  Lock,
  CheckCircle2,
  Sparkles,
  Download,
  Loader2,
  History
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import Image from "next/image"

import { billsApi, authApi, paymentsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  XCircle,
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  prefill: {
    name: string;
    contact: string;
    email: string;
  };
  theme: {
    color: string;
  };
}

interface RazorpayInstance {
  on: (event: string, handler: (response: { error?: { description: string } }) => void) => void;
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface Bill {
  id: string;
  month: string;
  total_amount: number;
  total_liters: number;
  status: "PAID" | "UNPAID";
  pdf_url?: string;
  is_locked?: boolean;
}

export default function PaymentPage() {
  const t = useTranslations("Payment")
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  // Fetch ALL bills
  const { data: bills = [], isLoading, refetch } = useQuery({
    queryKey: ["my-bills"],
    queryFn: async () => {
      // billsApi.list() without arguments now fetches all bills for the user
      const res = await billsApi.list()
      return res.data
    },
    enabled: !!userId,
  })

  // Find latest UNPAID bill, or just the latest bill if all paid
  // Backend sorts by month desc, so bills[0] is latest
  const latestBill = bills[0] as Bill | undefined
  const unpaidBill = bills.find((b: Bill) => b.status === "UNPAID")
  const activeBill = (unpaidBill || latestBill) as Bill | undefined

  const billAmount = Number(activeBill?.total_amount ?? 0)
  const totalLiters = Number(activeBill?.total_liters ?? 0)
  const isPaid = activeBill?.status === "PAID"

  const [qrCode, setQrCode] = useState<string | null>(null)

  const handlePayment = async (billId: string) => {
    try {
      const res = await paymentsApi.createOrder(billId)
      const order = res

      // For UPI/QR, we'll generate a payment link and show as QR
      // In a real scenario, this would be a UPI intent link
      const upiLink = `upi://pay?pa=dairyday@bank&pn=DairyDay&am=${order.amount / 100}&cu=INR&tn=Bill-${activeBill?.month || 'Payment'}`
      setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`)

      toast.info(t('qrGenerated'))

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: order.amount,
        currency: order.currency,
        name: "DairyDay",
        description: t('billPaymentDesc', { month: activeBill?.month || '' }),
        order_id: order.id,
        handler: async function () {
          setQrCode(null)
          toast.success(t('paymentSuccess'))
          refetch()
        },
        prefill: {
          name: t('customerName'),
          contact: "",
          email: ""
        },
        theme: {
          color: "#4f46e5"
        }
      }

      if (window.Razorpay) {
        const rzp1 = new window.Razorpay(options)
        rzp1.on('payment.failed', function (response) {
          toast.error(t('paymentFailed') + ": " + (response.error?.description || "Unknown error"))
        })
        rzp1.open()
      } else {
        toast.error(t('gatewayNotLoaded'))
      }
    } catch {
      toast.error(t('initiateFailed'))
    }
  }

  // Polling for payment status if QR is visible
  useEffect(() => {
    if (!qrCode || !activeBill) return
    const interval = setInterval(() => {
      refetch()
      // If bill status changes to PAID, clear QR
      if (activeBill.status === "PAID") {
        setQrCode(null)
        clearInterval(interval)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [qrCode, activeBill, refetch])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 min-h-[calc(100vh-140px)] text-foreground">

      {/* 1. Hero / Active Bill Section */}
      <div className="flex flex-col items-center justify-center relative">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.05, 0.1, 0.05],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={{
              background: isPaid
                ? "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {!activeBill && !isLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-8 rounded-2xl bg-foreground/5 border border-border/10"
            >
              <Sparkles className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold">{t('allCaughtUp')}</h2>
              <p className="text-muted-foreground">{t('noBills')}</p>
            </motion.div>
          ) : isPaid ? (
            /* ── SUCCESS STATE (All Paid) ── */
            <motion.div
              key="paid"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 relative z-10 py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </motion.div>
              <div>
                <h1 className="text-2xl font-black text-foreground mb-1">{t('noDues')}</h1>
                <p className="text-muted-foreground text-sm">
                  {t('lastBillPaid', { month: activeBill?.month || '' })}
                </p>
              </div>
            </motion.div>
          ) : (
            /* ── PAYMENT CARD ── */
            <motion.div
              key="unpaid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm relative z-10 space-y-6"
            >
              <div
                className="rounded-2xl p-6 border border-border/10 text-center backdrop-blur-xl bg-background/60 dark:bg-slate-900/60 shadow-2xl"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 text-[10px] px-2 py-0">
                    {t('dueFor', { month: activeBill?.month || '' })}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                  {t('totalPayable')}
                </p>
                {isLoading ? (
                  <div className="h-10 w-24 bg-foreground/[0.1] rounded-lg animate-pulse mx-auto mb-3" />
                ) : (
                  <h1 className="text-4xl font-black text-foreground tracking-tighter leading-none mb-3">
                    ₹{mounted ? (
                      <CountUp end={billAmount} duration={1.5} separator="," />
                    ) : (
                      billAmount.toLocaleString("en-IN")
                    )}
                  </h1>
                )}

                <div className="flex justify-between text-sm py-4 border-t border-border/10">
                  <span className="text-muted-foreground">{t('totalConsumption')}</span>
                  <span className="font-mono text-foreground">{totalLiters.toFixed(1)} L</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => activeBill && handlePayment(activeBill.id)}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl font-bold get-started-button text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-2"
                >
                  <Lock className="h-4 w-4" />
                  {t('payNow')}
                </motion.button>

                <AnimatePresence>
                  {qrCode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-border/10"
                    >
                      <div className="bg-white p-3 rounded-xl mx-auto w-fit mb-3">
                        <Image
                          src={qrCode}
                          alt={t('qrAlt')}
                          width={160}
                          height={160}
                          className="w-40 h-40"
                          unoptimized
                        />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-3">
                        {t('scanWithUpi')}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setQrCode(null)}
                      >
                        <XCircle className="h-3 w-3 mr-2" />
                        {t('cancelQr')}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                {t('securePayment', { gateway: 'Razorpay' })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Bill History Table */}
      {bills.length > 0 && (
        <Card className="border-none bg-background/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-foreground">{t('historyTitle')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-indigo-500/10">
                  <TableHead className="text-foreground/60">{t('month')}</TableHead>
                  <TableHead className="text-right text-foreground/60">{t('liters')}</TableHead>
                  <TableHead className="text-right text-foreground/60">{t('amount')}</TableHead>
                  <TableHead className="text-center text-foreground/60">{t('status')}</TableHead>
                  <TableHead className="text-right text-foreground/60">{t('invoice')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill: Bill) => (
                  <TableRow key={bill.id} className="hover:bg-indigo-500/5 transition-colors border-b border-indigo-500/5">
                    <TableCell className="font-medium text-foreground">{bill.month}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(bill.total_liters).toFixed(1)} L</TableCell>
                    <TableCell className="text-right font-bold text-foreground">₹{bill.total_amount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "border-0",
                        bill.status === "PAID" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" : "bg-rose-500/10 text-rose-600 dark:text-rose-500"
                      )}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PdfDownloadButton bill={bill} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  )
}

function PdfDownloadButton({ bill }: { bill: Bill }) {
  const { data: statusData } = useQuery({
    queryKey: ["pdf-status", bill.id],
    queryFn: async () => {
      const res = await billsApi.getPdfStatus(bill.id)
      return res.data
    },
    enabled: !!bill.is_locked && !bill.pdf_url,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string; pdf_url?: string } | undefined
      return data?.status === "completed" ? false : 5000
    },
  })

  const pdfUrl = bill.pdf_url || (statusData as { pdf_url?: string })?.pdf_url

  if (pdfUrl) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(pdfUrl, '_blank')}
        className="h-8 w-8 p-0 rounded-full hover:bg-indigo-500/10 hover:text-indigo-500"
      >
        <Download className="h-4 w-4" />
      </Button>
    )
  }

  if (bill.is_locked) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 opacity-50">
        <Loader2 className="h-3 w-3 animate-spin" />
      </Button>
    )
  }

  return <span className="text-muted-foreground">-</span>
}
