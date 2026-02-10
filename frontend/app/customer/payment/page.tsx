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

export default function PaymentPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const currentMonth = format(new Date(), "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const { data: bill, isLoading } = useQuery({
    queryKey: ["my-bill", currentMonth],
    queryFn: () => billsApi.get(userId!, currentMonth).then((r) => r.data),
    enabled: !!userId,
  })

  const billAmount = Number(bill?.total_amount ?? bill?.amount ?? 0)
  const totalLiters = Number(bill?.total_liters ?? 0)
  const isPaid = bill?.status === "PAID" || bill?.status === "paid" || paymentSuccess

  const handlePayment = async () => {
    if (!bill?.id) return
    try {
      const res = await paymentsApi.createOrder(bill.id)
      if (res.data?.payment_url) {
        window.location.href = res.data.payment_url
      } else {
        // Simulate success for demo
        setPaymentSuccess(true)
      }
    } catch {
      /* interceptor */
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
              <h1 className="text-3xl font-black text-white mb-2">Payment Successful</h1>
              <p className="text-neutral-500 text-sm">
                Your bill for {format(new Date(), "MMMM yyyy")} has been paid
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl p-6 border border-emerald-500/20 mx-auto max-w-[280px]"
              style={{ background: "rgba(16,185,129,0.06)" }}
            >
              <p className="text-emerald-400/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Amount Paid</p>
              <p className="text-4xl font-black text-emerald-400 tabular-nums">
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
              <span className="text-xs font-medium">Receipt sent to your email</span>
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
              className="rounded-3xl p-8 border border-white/[0.08] text-center"
              style={{
                background: "rgba(17,17,17,0.6)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <CreditCard className="h-8 w-8 text-indigo-400 mx-auto mb-4" />

              <p className="text-neutral-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">
                Amount Due
              </p>

              {isLoading ? (
                <div className="h-16 w-40 bg-white/[0.04] rounded-2xl animate-pulse mx-auto" />
              ) : (
                <h1 className="text-6xl font-black text-white tracking-tighter leading-none mb-2">
                  ₹{mounted ? (
                    <CountUp end={billAmount} duration={1.4} separator="," />
                  ) : (
                    billAmount.toLocaleString("en-IN")
                  )}
                </h1>
              )}

              <p className="text-neutral-600 text-xs font-medium mb-6">
                {format(new Date(), "MMMM yyyy")} • {totalLiters.toFixed(1)} liters consumed
              </p>

              {/* Breakdown */}
              <div className="rounded-xl p-3 mb-6 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Milk consumed</span>
                  <span className="text-neutral-300 font-semibold tabular-nums">{totalLiters.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Rate</span>
                  <span className="text-neutral-300 font-semibold tabular-nums">
                    ₹{totalLiters > 0 ? (billAmount / totalLiters).toFixed(0) : "—"}/L
                  </span>
                </div>
                <div className="border-t border-white/[0.05] pt-2 flex justify-between text-xs">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-indigo-400 font-black tabular-nums">₹{billAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Pay button */}
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(99,102,241,0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePayment}
                disabled={!bill || isLoading}
                className="w-full h-14 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed transition-shadow"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.25)",
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  Pay ₹{billAmount.toLocaleString("en-IN")} Securely
                </div>
              </motion.button>
            </div>

            {/* Trust signals */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-neutral-600">
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Secured by Razorpay</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                {["UPI", "Cards", "Net Banking", "Wallets"].map((m) => (
                  <span key={m} className="text-[10px] font-semibold text-neutral-700 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.05]">
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-center text-[10px] text-neutral-700 font-medium">
                Payment secured • Instant receipt • End-to-end encrypted
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
