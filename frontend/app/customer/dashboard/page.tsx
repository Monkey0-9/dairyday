"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, isSameMonth } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Flame,
  Droplets,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import Link from "next/link"

import { consumptionApi, billsApi, authApi, paymentsApi } from "@/lib/api"

/* ─── Types ─── */
interface ConsumptionDay {
  date: string
  quantity?: number | string
  liters?: number | string
}

/* ────────────────────────────────────────────────
   CUSTOMER OVERVIEW — TOP 1% PREMIUM DARK MODE
   ──────────────────────────────────────────────── */
export default function CustomerOverview() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const monthStr = format(selectedMonth, "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const { data: consumption, isLoading: isConsLoading } = useQuery({
    queryKey: ["my-consumption", monthStr],
    queryFn: () => consumptionApi.getMine(monthStr).then((r) => r.data),
    enabled: !!userId,
  })

  const { data: bill, isLoading: isBillLoading } = useQuery({
    queryKey: ["my-bill", monthStr],
    queryFn: () => billsApi.get(userId!, monthStr).then((r) => r.data),
    enabled: !!userId,
  })

  const totalLiters = useMemo(
    () =>
      consumption?.reduce(
        (s: number, d: ConsumptionDay) => s + Number(d.quantity ?? d.liters ?? 0),
        0
      ) ?? 0,
    [consumption]
  )

  const consumptionMap = useMemo(() => {
    const map: Record<string, number> = {}
    consumption?.forEach((d: ConsumptionDay) => {
      map[d.date] = Number(d.quantity ?? d.liters ?? 0)
    })
    return map
  }, [consumption])

  const streak = useMemo(() => {
    if (!consumption?.length) return 0
    const sorted = [...consumption].sort(
      (a: ConsumptionDay, b: ConsumptionDay) => b.date.localeCompare(a.date)
    )
    let count = 0
    for (const d of sorted) {
      if (Number(d.quantity ?? d.liters ?? 0) > 0) count++
      else break
    }
    return count
  }, [consumption])

  const avgDaily = useMemo(() => {
    const active = Object.values(consumptionMap).filter((v) => v > 0).length
    return active > 0 ? totalLiters / active : 0
  }, [consumptionMap, totalLiters])

  const billAmount = Number(bill?.total_amount ?? bill?.amount ?? 0)
  const isPaid = bill?.status === "PAID" || bill?.status === "paid"

  const handlePrev = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d })
  const handleNext = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d })

  const handlePayment = async () => {
    if (!bill?.id) return
    try {
      const res = await paymentsApi.createOrder(bill.id)
      window.location.href = res.data?.payment_url || "/customer/payment"
    } catch { /* interceptor */ }
  }

  /* ─ Stagger animation variants ─ */
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  }
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-lg mx-auto px-5 pt-6 pb-8 space-y-8"
    >
      {/* ── Month Selector ── */}
      <motion.div variants={item} className="flex items-center justify-center gap-3">
        <button onClick={handlePrev}
          className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="px-5 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] min-w-[180px] text-center">
          <span className="text-sm font-semibold text-white tracking-wide">
            {format(selectedMonth, "MMMM yyyy")}
          </span>
        </div>
        <button onClick={handleNext}
          disabled={isSameMonth(selectedMonth, new Date())}
          className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 active:scale-90"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </motion.div>

      {/* ── Hero Bill Card ── */}
      <motion.div variants={item}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-2xl"
          style={{
            background: isPaid
              ? "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)"
              : "linear-gradient(135deg, #3730a3 0%, #6366f1 40%, #818cf8 100%)",
            boxShadow: isPaid
              ? "0 20px 60px -12px rgba(16,185,129,0.3)"
              : "0 20px 60px -12px rgba(99,102,241,0.3)",
          }}
        >
          {/* Decorative orbs */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />

          <div className="relative z-10">
            <p className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] mb-3">
              Amount Due
            </p>

            {isBillLoading ? (
              <div className="h-[72px] w-52 bg-white/10 rounded-2xl animate-pulse" />
            ) : (
              <h1 className="text-7xl font-black text-white tracking-tighter leading-none mb-5">
                ₹{mounted ? (
                  <CountUp end={billAmount} duration={1.2} separator="," />
                ) : (
                  billAmount.toLocaleString("en-IN")
                )}
              </h1>
            )}

            <div className="flex items-center gap-3 mb-8">
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                </span>
              ) : (
                <motion.span
                  animate={{ boxShadow: ["0 0 0 0 rgba(244,63,94,0)", "0 0 0 8px rgba(244,63,94,0.15)", "0 0 0 0 rgba(244,63,94,0)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-1.5 bg-rose-500/25 backdrop-blur-sm border border-rose-400/30 text-white text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full"
                >
                  <Clock className="h-3.5 w-3.5" /> Unpaid
                </motion.span>
              )}
              {bill?.month && (
                <span className="text-white/40 text-xs font-medium">
                  {format(new Date(bill.month + "-01"), "MMMM yyyy")}
                </span>
              )}
            </div>

            {/* Pay Now */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePayment}
              disabled={!bill || isPaid || isBillLoading}
              className="w-full h-14 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isPaid ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)",
                color: isPaid ? "rgba(255,255,255,0.6)" : "#312e81",
                boxShadow: isPaid ? "none" : "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              {isPaid ? "✓ Already Paid" : `Pay ₹${billAmount.toLocaleString("en-IN")}`}
            </motion.button>

            {!isPaid && (
              <div className="flex items-center justify-center gap-2 mt-4 text-white/25">
                <Shield className="h-3 w-3" />
                <span className="text-[10px] font-medium tracking-wide">
                  Secured by Razorpay • UPI / Cards / Wallets
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Quick Stats (staggered) ── */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        <GlassStatCard
          icon={<Droplets className="h-4 w-4 text-indigo-400" />}
          label="This Month"
          value={Number(totalLiters).toFixed(1)}
          unit="L"
          loading={isConsLoading}
          mounted={mounted}
        />
        <GlassStatCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          label="Daily Avg"
          value={avgDaily.toFixed(1)}
          unit="L"
          loading={isConsLoading}
          mounted={mounted}
        />
        <GlassStatCard
          icon={<Flame className="h-4 w-4 text-amber-400" />}
          label="Streak"
          value={String(streak)}
          unit="days"
          loading={isConsLoading}
          mounted={mounted}
        />
      </motion.div>

      {/* ── Quick Links ── */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <Link href="/customer/calendar">
          <motion.div
            whileHover={{ scale: 1.02, borderColor: "rgba(99,102,241,0.2)" }}
            className="rounded-2xl p-4 border border-white/[0.06] transition-all group cursor-pointer"
            style={{ background: "#111111" }}
          >
            <Calendar className="h-5 w-5 text-indigo-400 mb-2" />
            <p className="text-sm font-bold text-white mb-0.5">Milk Calendar</p>
            <p className="text-[10px] text-neutral-500 flex items-center gap-1">
              View delivery history <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </motion.div>
        </Link>
        <Link href="/customer/records">
          <motion.div
            whileHover={{ scale: 1.02, borderColor: "rgba(99,102,241,0.2)" }}
            className="rounded-2xl p-4 border border-white/[0.06] transition-all group cursor-pointer"
            style={{ background: "#111111" }}
          >
            <TrendingUp className="h-5 w-5 text-emerald-400 mb-2" />
            <p className="text-sm font-bold text-white mb-0.5">Milk Records</p>
            <p className="text-[10px] text-neutral-500 flex items-center gap-1">
              Detailed breakdown <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  )
}

/* ─── Glass Stat Card ─── */
function GlassStatCard({
  icon, label, value, unit, loading, mounted,
}: {
  icon: React.ReactNode; label: string; value: string; unit?: string; loading: boolean; mounted: boolean
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.1)" }}
      className="rounded-2xl p-4 border border-white/[0.06] transition-all"
      style={{ background: "rgba(17,17,17,0.6)", backdropFilter: "blur(12px)" }}
    >
      <div className="mb-2">{icon}</div>
      {loading ? (
        <div className="h-6 w-14 bg-white/[0.04] rounded animate-pulse" />
      ) : (
        <p className="text-lg font-black text-white tracking-tight tabular-nums leading-none">
          {mounted ? <CountUp end={parseFloat(value) || 0} decimals={value.includes(".") ? 1 : 0} duration={0.8} /> : value}
          {unit && <span className="text-xs font-bold text-neutral-500 ml-0.5">{unit}</span>}
        </p>
      )}
      <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-[0.12em] mt-1.5">
        {label}
      </p>
    </motion.div>
  )
}
