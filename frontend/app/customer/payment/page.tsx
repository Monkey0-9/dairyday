"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Shield,
  Lock,
  CheckCircle2,
  CreditCard,
  Sparkles,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"

import { billsApi, authApi, paymentsApi } from "@/lib/api"
import { useTranslation } from "@/context/language-context"
import { toast } from "sonner"

// TypeScript declaration for Razorpay
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
    };
  }
}

export default function PaymentPage() {
  const { t } = useTranslation()
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const currentMonth = format(new Date(), "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const { data: bill, isLoading, refetch } = useQuery({
    queryKey: ["my-bill", currentMonth],
    queryFn: () => billsApi.get(userId!, currentMonth).then((r) => r.data),
    enabled: !!userId,
  })

  const billAmount = Number(bill?.total_amount ?? bill?.amount ?? 0)
  const totalLiters = Number(bill?.total_liters ?? 0)
  const isPaid = bill?.status === "PAID" || bill?.status === "paid" || paymentSuccess

  const handlePayment = async () => {
    if (!bill?.id) return
    setIsProcessing(true)

    try {
      // 1. Create a Razorpay order via the backend
      const orderData = await paymentsApi.createOrder(bill.id)

      // If no Razorpay SDK loaded or mock mode (no real order_id), simulate success
      if (!window.Razorpay || !orderData?.id?.startsWith("order_")) {
        toast.success("Payment recorded successfully!")
        setPaymentSuccess(true)
        setIsProcessing(false)
        return
      }

      // 2. Open Razorpay Checkout popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "DairyDay",
        description: `Milk Bill — ${format(new Date(), "MMMM yyyy")}`,
        order_id: orderData.id,
        handler: function (response: Record<string, unknown>) {
          // Payment successful!
          toast.success("Payment Successful! Thank you. 🎉")
          setPaymentSuccess(true)
          refetch() // Refresh bill status from server
        },
        prefill: {
          name: "",
          email: "",
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
            toast.info("Payment cancelled.")
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", function (response: Record<string, unknown>) {
        setIsProcessing(false)
        const errorDesc = (response as Record<string, Record<string, string>>)?.error?.description
        toast.error(errorDesc || "Payment failed. Please try again.")
      })
      rzp.open()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Payment failed. Try again."
      toast.error(message)
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-8 min-h-[calc(100vh-140px)] flex flex-col items-center justify-center relative">
      {/* Animated radial pulse background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: isPaid
              ? "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {isPaid ? (
          /* ── SUCCESS STATE ── */
          <motion.div
            key="paid"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center space-y-6 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: "0 0 40px rgba(16,185,129,0.2)" }}
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-3xl font-black text-foreground mb-2">{t('paymentSuccess')}</h1>
              <p className="text-neutral-500 text-sm">
                {t('paymentPaidSub')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl p-6 border border-emerald-500/20 mx-auto max-w-[280px] bg-emerald-500/[0.06]"
            >
              <p className="text-emerald-500/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">{t('amountPaid')}</p>
              <p className="text-4xl font-black text-emerald-500 tabular-nums">
                ₹{billAmount.toLocaleString("en-IN")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-2 text-neutral-600"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{t('receiptSent')}</span>
            </motion.div>
          </motion.div>
        ) : (
          /* ── PAYMENT CARD ── */
          <motion.div
            key="unpaid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-sm relative z-10 space-y-6"
          >
            {/* Glass card */}
            <div
              className="rounded-3xl p-8 border border-border text-center bg-card/60 dark:bg-card/40 backdrop-blur-xl"
              style={{
                boxShadow: "0 20px 50px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <CreditCard className="h-8 w-8 text-indigo-500 mx-auto mb-4" />

              <p className="text-neutral-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">
                {t('amountDue')}
              </p>

              {isLoading ? (
                <div className="h-16 w-40 bg-foreground/5 rounded-2xl animate-pulse mx-auto" />
              ) : (
                <h1 className="text-6xl font-black text-foreground tracking-tighter leading-none mb-2">
                  ₹{mounted ? (
                    <CountUp end={billAmount} duration={1.4} separator="," />
                  ) : (
                    billAmount.toLocaleString("en-IN")
                  )}
                </h1>
              )}

              <p className="text-neutral-500 text-xs font-medium mb-6">
                {format(new Date(), "MMMM yyyy")} • {totalLiters.toFixed(1)} {t('litersConsumed')}
              </p>

              {/* Breakdown */}
              <div className="rounded-xl p-3 mb-6 space-y-2 bg-foreground/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 font-medium">{t('milkConsumed')}</span>
                  <span className="text-foreground font-bold tabular-nums">{totalLiters.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 font-medium">{t('rate')}</span>
                  <span className="text-foreground font-bold tabular-nums">
                    ₹{totalLiters > 0 ? (billAmount / totalLiters).toFixed(0) : "—"}/L
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-xs">
                  <span className="text-foreground font-black uppercase tracking-wider">{t('total')}</span>
                  <span className="text-indigo-500 font-black tabular-nums">₹{billAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Pay button */}
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(99,102,241,0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePayment}
                disabled={!bill || isLoading || isProcessing}
                className="w-full h-14 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed transition-shadow"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.25)",
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  {isProcessing ? "Processing..." : `${t('paySecurely')} ₹${billAmount.toLocaleString("en-IN")}`}
                </div>
              </motion.button>
            </div>

            {/* Trust signals */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-neutral-600">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">{t('securedBy')}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                {["UPI", "Cards", "Net Banking", "Wallets"].map((m) => (
                  <span key={m} className="text-[10px] font-semibold text-neutral-500 bg-foreground/5 px-2 py-0.5 rounded-md border border-border">
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-center text-[10px] text-neutral-700 font-medium">
                {t('paymentTrust')}
              </p>
            </div>

            {/* Direct UPI Section */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => document.getElementById('upi-section')?.classList.toggle('hidden')}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 underline underline-offset-4 w-full text-center"
              >
                Or Pay via Direct UPI (No Gateway)
              </button>
              
              <div id="upi-section" className="hidden mt-6 space-y-4 animate-in slide-in-from-top-2">
                <div className="p-4 bg-white rounded-xl border border-border flex flex-col items-center">
                  <p className="text-[10px] uppercase font-bold text-neutral-500 mb-2">Scan to Pay ₹{billAmount}</p>
                  {/* Dynamic QR Code for Specific Amount */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=9980592787@ybl&pn=DairyDay&am=${billAmount}&cu=INR`)}`}
                    alt="UPI QR Code"
                    className="w-40 h-40 rounded-lg border border-neutral-100"
                  />
                  <p className="text-[10px] font-mono text-neutral-400 mt-2">9980592787@ybl</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">Enter Payment Reference (UTR)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. 405812345678"
                      className="flex-1 h-10 rounded-lg border border-border px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-background"
                      id="utr-input"
                    />
                    <button
                      onClick={async () => {
                        const utr = (document.getElementById('utr-input') as HTMLInputElement).value
                        if (!utr || utr.length < 4) {
                          toast.error("Please enter a valid UTR")
                          return
                        }
                        
                        setIsProcessing(true)
                        try {
                          await paymentsApi.submitReference(bill.id, utr)
                          toast.success("Payment submitted for verification!")
                          setPaymentSuccess(true)
                          refetch()
                        } catch (e) {
                          toast.error("Failed to submit reference")
                        } finally {
                          setIsProcessing(false)
                        }
                      }}
                      disabled={isProcessing}
                      className="h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {isProcessing ? "..." : "Verify"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
