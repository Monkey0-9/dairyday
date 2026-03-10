"use client"

import React, { useState, useMemo, useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, addDays, subDays } from "date-fns"
import { DailyEntrySkeleton } from "@/components/skeletons"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Minus,
  Users,
  Loader2,
  ArrowRight,
  Fingerprint,
  Activity,
  Keyboard,
  ShieldAlert,
  Server
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { EmptyUserState } from "@/components/ui/empty-state"
import { PremiumErrorState } from "@/components/ui/state-displays"
import { adminApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useOptimisticDailyEntry } from "@/hooks/use-optimistic-entry"

const MetricNode = ({ icon, label, value, suffix, color, delay = 0 }: { icon: React.ReactNode; label: string; value: string; suffix?: string; color: "primary" | "emerald" | "indigo"; delay?: number }) => {
  const colors = {
    primary: "text-primary border-primary/20 bg-primary/5",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    indigo: "text-accent border-accent/20 bg-accent/5",
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      className="p-3 rounded-xl glass-card flex flex-col items-center justify-center text-center group hover:border-primary/30 transition-all duration-700"
    >
      <div className={cn("p-2 rounded-lg mb-2 border transition-all duration-700 group-hover:scale-110 shadow-glass-elev", colors[color as keyof typeof colors])}>
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black font-heading tracking-tight italic text-white">{value}</span>
        {suffix && <span className="text-[10px] font-micro opacity-40">{suffix}</span>}
      </div>
      <span className="font-micro text-[10px] mt-1 italic uppercase tracking-widest">{label}</span>
    </motion.div>
  )
}

export default function DailyEntryPage() {
  const t = useTranslations('Admin.dailyEntry')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [localEntries, setLocalEntries] = useState<Record<string, number | "">>({})
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set())
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const { data: entries, isLoading, isError, refetch } = useQuery({
    queryKey: ["daily-entry", dateStr],
    queryFn: async () => {
      const res = await adminApi.getDailyEntry(dateStr)
      const initialEntries: Record<string, number | ""> = {}
      res.data.forEach((entry: { id: string; liters: number }) => {
        initialEntries[entry.id] = entry.liters
      })
      setLocalEntries(initialEntries)
      setUnsavedIds(new Set())
      return res.data
    },
  })

  const saveMutation = useOptimisticDailyEntry(dateStr);

  const filteredEntries = useMemo(() => {
    if (!entries) return []
    return entries.filter((entry: { name?: string; phone?: string; email?: string }) =>
      (entry.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (entry.phone?.includes(searchQuery) ?? false) ||
      (entry.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
  }, [entries, searchQuery])

  const totals = useMemo(() => {
    const total = Object.values(localEntries).reduce((sum: number, val) => sum + (typeof val === 'number' ? val : 0), 0)
    const active = Object.values(localEntries).filter(v => typeof v === 'number' && v > 0).length
    return { total, active }
  }, [localEntries])

  const copyFromYesterday = useCallback(async () => {
    const yesterdayStr = format(subDays(selectedDate, 1), "yyyy-MM-dd")
    try {
      const res = await adminApi.getDailyEntry(yesterdayStr)
      if (!res.data?.length) {
        return
      }
      const newEntries: Record<string, number | ""> = {}
      const newUnsaved = new Set<string>()
      res.data.forEach((entry: { id: string; liters: number }) => {
        newEntries[entry.id] = entry.liters
        newUnsaved.add(entry.id)
      })
      setLocalEntries(prev => ({ ...prev, ...newEntries }))
      setUnsavedIds(prev => new Set([...prev, ...newUnsaved]))
      toast.info(t('patternSync', { count: newUnsaved.size }))
    } catch { toast.error(t('faultYesterdayScan')) }
  }, [selectedDate, t])

  if (isError) {
    return <PremiumErrorState
      message={t('commError')}
      onRetry={() => refetch()}
    />
  }

  if (isLoading) {
    return <DailyEntrySkeleton />
  }

  const handleLiterChange = (id: string, valueStr: string) => {
    if (valueStr === "") {
      setLocalEntries(prev => ({ ...prev, [id]: "" }))
      setUnsavedIds(prev => new Set(prev).add(id))
      return
    }
    const value = parseFloat(valueStr)
    if (isNaN(value)) return
    const newValue = Math.max(0, Math.round(value * 100) / 100)
    setLocalEntries(prev => ({ ...prev, [id]: newValue }))
    setUnsavedIds(prev => new Set(prev).add(id))
  }

  const handleSave = () => {
    if (unsavedIds.size === 0) return

    // Check for empty fields
    const hasEmpty = Array.from(unsavedIds).some(id => localEntries[id] === "")
    if (hasEmpty) {
      toast.error(t('fillRequiredFields', { defaultValue: "Please fill all required fields" }))
      return
    }

    const dataToSave = entries
      .filter((e: { id: string }) => unsavedIds.has(e.id))
      .map((e: { id: string }) => ({
        user_id: e.id,
        liters: localEntries[e.id] as number,
      }))
    saveMutation.mutate(dataToSave)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    const currentIdx = filteredEntries.findIndex((item: { id: string }) => item.id === id)
    if (currentIdx === -1) return
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault()
      const next = filteredEntries[currentIdx + 1]
      if (next) { inputRefs.current[next.id]?.focus(); inputRefs.current[next.id]?.select(); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = filteredEntries[currentIdx - 1]
      if (prev) { inputRefs.current[prev.id]?.focus(); inputRefs.current[prev.id]?.select(); }
    }
  }

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 relative">
      {/* atmospheric lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[200px] rounded-full opacity-30 animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/5 blur-[200px] rounded-full opacity-20 animate-pulse-glow animation-delay-3000" />
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10 space-y-6">
        {/* Header command area */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-white/[0.05] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary shadow-glow-primary">
                <Server className="w-4 h-4 text-white" />
              </div>
              <span className="font-micro text-[10px] text-primary tracking-[0.4em] uppercase">{t('adminNode')}</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black font-heading italic uppercase tracking-tighter leading-none">{t('title')}</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/10 rounded-xl glass-card">
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="h-8 w-8 rounded-lg">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 text-center min-w-[120px]">
                <span className="font-heading font-black italic text-sm tracking-tight uppercase whitespace-nowrap">
                  {format(selectedDate, "dd MMM yyyy")}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="h-8 w-8 rounded-lg">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={copyFromYesterday} className="h-8 px-4 rounded-lg bg-white/[0.02] border border-white/10 hover:bg-primary hover:text-white transition-all duration-500 font-heading font-black italic text-xs gap-2">
              <Plus size={14} /> {t('cloneHistory')}
            </Button>
          </div>
        </header>

        {/* Tactical Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <MetricNode color="primary" icon={<Users size={18} />} label={t('totalNodes')} value={String(entries?.length || 0)} />
          <MetricNode color="emerald" icon={<ShieldAlert size={18} />} label={t('activeVectors')} value={String(totals.active)} />
          <MetricNode color="indigo" icon={<Activity size={18} />} label={t('aggregateVolume')} value={totals.total.toFixed(1)} suffix="L" />
        </div>

        {/* Operational Hub */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="relative group w-full max-w-xl">
              <div className="absolute inset-x-0 -bottom-1 h-2 bg-primary/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within:text-primary transition-colors" />
              <input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full bg-white/[0.02] border border-white/5 rounded-xl pl-10 pr-4 text-[13px] font-heading font-black italic tracking-tight placeholder:text-white/5 outline-none transition-all duration-700 hover:border-white/10 focus:border-primary/40 focus:bg-white/[0.04]"
              />
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass-card border-white/5">
              <Keyboard className="text-primary w-4 h-4 animate-pulse" />
              <div className="flex flex-col">
                <span className="font-micro text-[7px] tracking-widest text-primary uppercase">{t('navigation')}</span>
                <span className="font-bold text-[10px] tracking-tight uppercase italic">{t('keyboardShortcuts')}</span>
              </div>
            </div>
          </div>

          {/* Liquid List */}
          <div className="space-y-3 mask-edge-fade-bottom max-h-[60vh] overflow-y-auto custom-scrollbar pb-10">
            <AnimatePresence mode="popLayout" initial={false}>
              {isLoading ? (
                <DailyEntrySkeleton count={6} />
              ) : filteredEntries.length === 0 ? (
                <div className="py-20">
                  <EmptyUserState />
                </div>
              ) : (
                filteredEntries.map((entry: { id: string; name: string; phone?: string; email?: string }, i: number) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all duration-700 flex flex-col md:flex-row md:items-center justify-between gap-4",
                      unsavedIds.has(entry.id)
                        ? "glass-card border-primary/40 bg-primary/5 scale-[1.01] z-10 shadow-lg"
                        : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center font-heading font-black italic text-sm text-white/10 group-hover:text-primary transition-all shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-heading font-black italic tracking-tight text-white uppercase truncate">{entry.name}</h3>
                          <span className="font-mono text-[11px] text-primary/80 tracking-wide mt-0.5 hidden sm:inline-block">{entry.email || entry.id}</span>
                        </div>
                        <span className="font-micro text-[9px] text-white/20 tracking-[0.2em] uppercase block truncate">{entry.phone || t('anonNode')}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-2 md:pt-0 border-t border-white/5 md:border-0 pl-14 md:pl-0">
                      <div className="flex items-center h-10 bg-black/40 rounded-xl p-1 border border-white/5 hover:border-primary/30 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleLiterChange(entry.id, String((typeof localEntries[entry.id] === 'number' ? localEntries[entry.id] as number : 1) - 0.25))}>
                          <Minus size={14} />
                        </Button>
                        <div className="px-3 flex flex-col items-center min-w-[60px]">
                          <input
                            type="number"
                            step="0.05"
                            value={localEntries[entry.id] === undefined ? 0 : localEntries[entry.id]}
                            onChange={(e) => handleLiterChange(entry.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, entry.id)}
                            ref={el => { inputRefs.current[entry.id] = el }}
                            title={t('enterLiters')}
                            aria-label={`${t('enterLiters')} for ${entry.name}`}
                            className="w-16 bg-transparent border-0 text-center text-xl font-heading font-black tracking-tight text-white focus:outline-none focus:ring-0 italic select-all"
                          />
                          <span className="font-micro -mt-1 text-[8px] text-primary/40 uppercase tracking-widest">{t('nodeVal')}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleLiterChange(entry.id, String((typeof localEntries[entry.id] === 'number' ? localEntries[entry.id] as number : 0) + 0.25))}>
                          <Plus size={14} />
                        </Button>
                      </div>
                      {unsavedIds.has(entry.id) && (
                        <div className="h-10 w-1 rounded-full bg-primary shadow-glow-primary animate-pulse" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* authorization footer */}
        <AnimatePresence>
          {unsavedIds.size > 0 && (
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center"
            >
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-16 w-full max-w-lg rounded-2xl bg-white text-black hover:bg-primary hover:text-white text-xl font-black font-heading italic tracking-tight gap-4 group shadow-2xl transition-all duration-700 relative overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {saveMutation.isPending ? (
                    <motion.div key="l" className="flex items-center gap-3"><Loader2 size={24} className="animate-spin" /> <span>{t('syncing')}</span></motion.div>
                  ) : (
                    <motion.div key="r" className="flex items-center gap-4">
                      <Fingerprint size={28} />
                      <span>{t('authorize', { count: unsavedIds.size })}</span>
                      <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-sweep" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
