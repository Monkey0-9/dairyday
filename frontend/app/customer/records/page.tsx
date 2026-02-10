"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, isSameMonth } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Droplets,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CountUp from "react-countup"

import { consumptionApi, authApi } from "@/lib/api"

interface ConsumptionDay {
  date: string
  quantity?: number | string
  liters?: number | string
}

export default function MilkRecordsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const monthStr = format(selectedMonth, "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const { data: consumption, isLoading } = useQuery({
    queryKey: ["my-consumption", monthStr],
    queryFn: () => consumptionApi.getMine(monthStr).then((r) => r.data),
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

  const sortedRecords = useMemo(
    () =>
      consumption
        ? [...consumption].sort(
            (a: ConsumptionDay, b: ConsumptionDay) => b.date.localeCompare(a.date)
          )
        : [],
    [consumption]
  )

  const handlePrev = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d })
  const handleNext = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d })

  const handleExport = async () => {
    try {
      const res = await consumptionApi.export(monthStr)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `milk_records_${monthStr}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      console.error("Export failed", e)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
  }
  const item = {
    hidden: { opacity: 0, x: -12 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  }

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Milk Records</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Detailed delivery history</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExport}
          className="h-9 px-4 rounded-xl flex items-center gap-2 text-xs font-bold text-neutral-400 border border-white/[0.08] hover:border-indigo-500/30 hover:text-indigo-400 transition-all"
          style={{ background: "rgba(17,17,17,0.6)" }}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </motion.button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={handlePrev}
          className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <AnimatePresence mode="wait">
          <motion.div
            key={monthStr}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="px-5 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] min-w-[180px] text-center"
          >
            <span className="text-sm font-semibold text-white tracking-wide">
              {format(selectedMonth, "MMMM yyyy")}
            </span>
          </motion.div>
        </AnimatePresence>
        <button onClick={handleNext}
          disabled={isSameMonth(selectedMonth, new Date())}
          className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 active:scale-90"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Records list */}
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.06]"
        style={{ background: "#111111" }}
      >
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] px-5 py-3 border-b border-white/[0.06]" style={{ background: "#0d0d0d" }}>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em]">Date</span>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em]">Liters</span>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] px-5 py-4 border-b border-white/[0.03]">
                <div className="h-4 w-28 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-4 w-12 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ))
          ) : sortedRecords.length > 0 ? (
            <motion.div variants={container} initial="hidden" animate="show">
              {sortedRecords.map((day: ConsumptionDay, idx: number) => {
                const qty = Number(day.quantity ?? day.liters ?? 0)
                return (
                  <motion.div
                    key={day.date}
                    variants={item}
                    whileHover={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      x: 4,
                    }}
                    className={`grid grid-cols-[1fr_auto] items-center px-5 py-4 border-b border-white/[0.03] cursor-default transition-colors ${
                      idx % 2 === 1 ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-indigo-300 tabular-nums">
                        {format(new Date(day.date), "dd MMM, EEEE")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className={`h-3 w-3 ${qty > 0 ? "text-emerald-500" : "text-neutral-700"}`} />
                      <span className={`text-sm font-black tabular-nums ${
                        qty > 0 ? "text-white" : "text-neutral-600"
                      }`}>
                        {qty > 0 ? `${qty.toFixed(1)} L` : "—"}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <div className="px-5 py-16 text-center text-neutral-600 text-sm">
              No records found for this month.
            </div>
          )}
        </div>

        {/* Total row */}
        {sortedRecords.length > 0 && (
          <div
            className="grid grid-cols-[1fr_auto] items-center px-5 py-4 border-t border-white/[0.08]"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(17,17,17,1) 100%)" }}
          >
            <span className="text-sm font-black text-white uppercase tracking-wider">
              Total
            </span>
            <span className="text-base font-black text-indigo-400 tabular-nums">
              {mounted ? (
                <><CountUp end={totalLiters} decimals={1} duration={0.8} /> L</>
              ) : (
                `${totalLiters.toFixed(1)} L`
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
