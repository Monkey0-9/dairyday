"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isBefore,
  isSameDay,
  isSameMonth,
  getDay,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Flame,
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

export default function MilkCalendarPage() {
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

  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }),
    [selectedMonth]
  )

  const consumptionMap = useMemo(() => {
    const map: Record<string, number> = {}
    consumption?.forEach((d: ConsumptionDay) => {
      map[d.date] = Number(d.quantity ?? d.liters ?? 0)
    })
    return map
  }, [consumption])

  const totalLiters = useMemo(
    () => Object.values(consumptionMap).reduce((a, b) => a + b, 0),
    [consumptionMap]
  )

  const activeDays = useMemo(
    () => Object.values(consumptionMap).filter((v) => v > 0).length,
    [consumptionMap]
  )

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

  const maxLiters = useMemo(
    () => Math.max(...Object.values(consumptionMap), 1),
    [consumptionMap]
  )

  const handlePrev = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d })
  const handleNext = () =>
    setSelectedMonth((p) => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d })

  /* ─ Hover state for floating card ─ */
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-8 space-y-6">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrev}
          className="h-10 w-10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.h2
            key={monthStr}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-bold text-white tracking-wide"
          >
            {format(selectedMonth, "MMMM yyyy")}
          </motion.h2>
        </AnimatePresence>

        <button onClick={handleNext}
          disabled={isSameMonth(selectedMonth, new Date())}
          className="h-10 w-10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 active:scale-90"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Streak + Total bar */}
      <div className="flex items-center justify-between px-1">
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 text-emerald-400"
          >
            <Flame className="h-4 w-4" />
            <span className="text-sm font-bold">{streak} day streak</span>
          </motion.div>
        )}
        <div className="flex items-center gap-1.5 text-neutral-400 ml-auto">
          <Droplets className="h-3.5 w-3.5" />
          <span className="text-sm font-bold tabular-nums">
            {mounted ? (
              <CountUp end={totalLiters} decimals={1} duration={0.8} />
            ) : (
              totalLiters.toFixed(1)
            )}
            <span className="text-neutral-600 ml-0.5">L total</span>
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className="rounded-2xl p-4 border border-white/[0.06]"
        style={{ background: "rgba(17,17,17,0.6)", backdropFilter: "blur(12px)" }}
      >
        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2 relative">
          {/* Empty slots */}
          {Array.from({ length: getDay(startOfMonth(selectedMonth)) }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const liters = consumptionMap[key] || 0
            const isFutureDay = isBefore(new Date(), day) && !isSameDay(day, new Date())
            const today = isToday(day)
            const isHovered = hoveredDay === key

            // Intensity based on max
            const intensity = liters > 0 ? Math.min(liters / maxLiters, 1) : 0

            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setHoveredDay(key)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-default transition-all ${
                  today ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#0a0a0a]" : ""
                }`}
                style={{
                  background: isFutureDay
                    ? "rgba(255,255,255,0.01)"
                    : liters > 0
                    ? `rgba(16,185,129,${0.12 + intensity * 0.55})`
                    : isBefore(day, new Date())
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.01)",
                  border: liters === 0 && isBefore(day, new Date()) && !isFutureDay
                    ? "1px solid rgba(244,63,94,0.08)"
                    : "1px solid transparent",
                  boxShadow: liters > 0 && intensity > 0.5
                    ? `0 0 12px rgba(16,185,129,${intensity * 0.2})`
                    : "none",
                }}
              >
                <span className={`text-xs font-bold leading-none ${
                  today ? "text-white" :
                  liters > 0 ? "text-emerald-300" :
                  isFutureDay ? "text-neutral-800" :
                  "text-neutral-500"
                }`}>
                  {format(day, "d")}
                </span>
                {liters > 0 && (
                  <span className="text-[7px] font-bold text-emerald-400/70 mt-0.5 tabular-nums">
                    {liters.toFixed(1)}
                  </span>
                )}

                {/* Floating card on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-xl whitespace-nowrap pointer-events-none"
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                      }}
                    >
                      <p className="text-[10px] text-neutral-400 font-medium">
                        {format(day, "EEEE, dd MMM")}
                      </p>
                      <p className={`text-sm font-black ${liters > 0 ? "text-emerald-400" : "text-neutral-600"}`}>
                        {liters > 0 ? `${liters.toFixed(1)} Liters` : "No delivery"}
                      </p>
                      {/* Arrow */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                        style={{ background: "#1a1a1a", borderRight: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5">
        {[
          { label: "None", bg: "rgba(255,255,255,0.03)", border: "rgba(244,63,94,0.1)" },
          { label: "Low", bg: "rgba(16,185,129,0.15)", border: "transparent" },
          { label: "Medium", bg: "rgba(16,185,129,0.35)", border: "transparent" },
          { label: "High", bg: "rgba(16,185,129,0.6)", border: "transparent" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[4px]" style={{ background: l.bg, border: `1px solid ${l.border}` }} />
            <span className="text-[10px] text-neutral-600 font-medium">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Days", value: activeDays, color: "text-indigo-400" },
          { label: "Total Liters", value: totalLiters.toFixed(1), color: "text-emerald-400" },
          { label: "Avg / Day", value: activeDays > 0 ? (totalLiters / activeDays).toFixed(1) : "0.0", color: "text-amber-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center border border-white/[0.05]"
            style={{ background: "#111111" }}
          >
            <p className={`text-lg font-black tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-semibold text-neutral-600 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
