"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { format, isBefore, subDays } from "date-fns"
import { Loader2, Milk, Lock, ShieldCheck, Activity, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Calendar } from "@/components/ui/calendar"
import { DialogFooter } from "@/components/ui/dialog"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { consumptionApi, usersApi } from "@/lib/api"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ConsumptionRecord {
  date: string
  quantity: number
  extra_qty: number
  status: 'PENDING' | 'DELIVERED' | 'CANCELLED' | 'SKIPPED'
  locked: boolean
  request_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_quantity?: number
  requested_extra_qty?: number
}

const liquidEntrance = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

import { useQueryClient } from "@tanstack/react-query"

export default function ConsumptionCalendar() {
  const t = useTranslations('Calendar')
  const queryClient = useQueryClient()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [month, setMonth] = useState<Date | undefined>(undefined)
  const [records, setRecords] = useState<ConsumptionRecord[]>([])
  const [dailyTargetQty, setDailyTargetQty] = useState<number>(1)
  const [, setIsLoading] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    const now = new Date()
    setDate(now)
    setMonth(now)
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data } = await usersApi.getMe()
      if (data && data.daily_target_qty) {
        setDailyTargetQty(Number(data.daily_target_qty))
      }
    } catch (err) {
      console.error("USER_PROFILE_SYNC_FAILURE", err)
    }
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ConsumptionRecord | null>(null)
  const [reduceQty, setReduceQty] = useState<number>(0)
  const [editExtraQty, setEditExtraQty] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (month) {
      fetchRecords(month)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchRecords is stable
  }, [month])

  const fetchRecords = async (targetMonth: Date) => {
    setIsLoading(true)
    try {
      const monthStr = format(targetMonth, 'yyyy-MM')
      const { data } = await consumptionApi.getMine(monthStr)
      if (Array.isArray(data)) {
        setRecords(data)
      }
    } catch {
      toast.error(t('fetchError'))
    } finally {
      setIsLoading(false)
    }
  }

  // 7-day Lock Logic: 
  // - Records older than 7 days are hard-locked.
  // - Today and Yesterday are "Ghost Edit" capable.
  const getLockStatus = (day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = subDays(today, 7);

    // Archive finalization for deep history
    if (isBefore(day, sevenDaysAgo)) return 'LOCKED';

    // Any day after 7-day archive is eligible for Modification (Ghost Mode)
    // This includes Today, Yesterday, and all Future dates for Pre-orders
    return 'GHOST_EDIT';
  }

  const handleDayClick = (day: Date) => {
    setDate(day)
    const dateStr = format(day, 'yyyy-MM-dd')
    const record = records.find(r => r.date === dateStr) || {
      date: dateStr,
      quantity: dailyTargetQty,
      extra_qty: 0,
      status: 'PENDING',
      locked: false
    }

    const isPending = record.request_status === 'PENDING';
    const currentReduce = isPending && record.requested_quantity !== null && record.requested_quantity !== undefined
      ? Math.max(0, record.quantity - record.requested_quantity)
      : 0;

    setSelectedRecord(record)
    setReduceQty(currentReduce)
    setEditExtraQty(isPending && record.requested_extra_qty !== null && record.requested_extra_qty !== undefined ? record.requested_extra_qty : record.extra_qty)
    setIsPaused(record.status === 'CANCELLED' || record.status === 'SKIPPED' || (isPending && record.requested_quantity === 0))

    const lockStatus = getLockStatus(day);
    if (lockStatus === 'GHOST_EDIT') {
      setIsDialogOpen(true)
    } else {
      toast.error(t('immutableLock'))
    }
  }

  const handleSave = async () => {
    if (!selectedRecord || !date) return
    const originalRecords = [...records]
    const netQty = isPaused ? 0 : Math.max(0, (Number(selectedRecord.quantity) || dailyTargetQty) - reduceQty)

    const newRecord: ConsumptionRecord = {
      ...selectedRecord,
      requested_quantity: netQty,
      request_status: 'PENDING',
      status: isPaused ? 'SKIPPED' : selectedRecord.status
    }

    setRecords(prev => prev.map(r => r.date === newRecord.date ? newRecord : r))

    setIsSaving(true)
    setIsDialogOpen(false)

    try {
      await consumptionApi.updateMine({
        date: selectedRecord.date,
        quantity: netQty,
        extra_qty: isPaused ? 0 : editExtraQty,
        status: isPaused ? 'SKIPPED' : 'PENDING',
      })
      toast.success(t('handoffSuccess'))
      queryClient.invalidateQueries({ queryKey: ["my-bills"] })
      queryClient.invalidateQueries({ queryKey: ["my-consumption"] })
      fetchRecords(month!)
    } catch {
      setRecords(originalRecords)
      toast.error(t('commError'))
    } finally {
      setIsSaving(false)
    }
  }

  const deliveredDays = records.filter(r => r.status === 'DELIVERED').map(r => new Date(r.date))
  const skippedDays = records.filter(r => ['CANCELLED', 'SKIPPED'].includes(r.status) && r.request_status !== 'PENDING').map(r => new Date(r.date))
  const extraDays = records.filter(r => (r.extra_qty > 0 || r.requested_extra_qty! > 0) && r.status !== 'CANCELLED').map(r => new Date(r.date))
  const pendingDays = records.filter(r => r.request_status === 'PENDING').map(r => new Date(r.date))

  return (
    <div className="grid gap-10 md:grid-cols-2 max-w-7xl mx-auto p-6">
      <motion.div {...liquidEntrance} className="space-y-6">
        <Card className="glass-card overflow-hidden h-fit border-border/5 bg-background/60 dark:bg-obsidian-900/60 backdrop-blur-3xl shadow-glow-primary/5">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="font-micro tracking-[0.4em] text-primary/60">{t('temporalGrid')}</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-foreground/5 rounded-full border border-border/5">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[8px] font-black tracking-widest text-foreground/40 uppercase">{t('authSecure')}</span>
              </div>
            </div>
            <CardTitle className="text-3xl font-heading font-black italic uppercase tracking-tighter mt-4 text-foreground">{t('title').split(' ')[0]} <span className="text-primary italic">{t('node')}</span></CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6 text-foreground">
            {hasMounted && (
              <Calendar
                mode="single"
                selected={date}
                month={month}
                onMonthChange={setMonth}
                onDayClick={handleDayClick}
                modifiers={{ delivered: deliveredDays, skipped: skippedDays, extra: extraDays, pending: pendingDays }}
                modifiersClassNames={{
                  delivered: "border border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold",
                  skipped: "opacity-20 grayscale",
                  extra: "border border-primary/50 bg-primary/10 text-primary rounded-xl font-bold shadow-glow-primary/20",
                  pending: "border-2 border-dashed border-amber-500/50 bg-amber-500/5 animate-pulse",
                }}
                className="bg-transparent"
              />
            )}
          </CardContent>
          <div className="p-6 bg-foreground/[0.02] border-t border-border/5 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-primary" />
              <span className="font-micro text-[10px] text-foreground/60">{t('legendDelivered')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary shadow-glow-primary" />
              <span className="font-micro text-[10px] text-foreground/60">{t('legendExtra')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse border border-amber-400/50" />
              <span className="font-micro text-[10px] text-foreground/60">{t('pendingVerify')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-foreground/20" />
              <span className="font-micro text-[10px] text-foreground/60">{t('lockedNode')}</span>
            </div>
            <div className="col-span-2 flex items-start gap-1 p-2 bg-primary/5 rounded-lg border border-primary/10">
              <Activity className="w-3 h-3 text-primary animate-pulse mt-0.5" />
              <span className="font-micro text-[8px] leading-tight text-foreground/40 uppercase tracking-tighter">{t('syncActive')}</span>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div {...liquidEntrance} transition={{ delay: 0.1 }} className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={date?.toISOString()}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card bg-background/40 dark:bg-obsidian-800/40 border-border/5 border backdrop-blur-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-125 rotate-12 transition-transform duration-1000 group-hover:scale-110 text-foreground">
                <Milk size={80} />
              </div>

              <header className="mb-10 text-foreground">
                <span className="font-micro text-foreground/20 mb-2 block">{date ? format(date, 'EEEE_ISO_8601') : t('selectNode')}</span>
                <h2 className="font-big text-foreground italic uppercase">{date ? format(date, 'dd MMM') : '--'}</h2>
                <div className="mt-4 flex gap-4">
                  {date && (
                    <Badge className={cn(
                      "rounded-full px-4 py-1 font-black italic transition-all",
                      getLockStatus(date) === 'LOCKED' ? "bg-foreground/5 text-foreground/20 border-border/5" :
                        selectedRecord?.request_status === 'PENDING' ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse" :
                          getLockStatus(date) === 'GHOST_EDIT' ? "bg-primary/20 text-primary border-primary/20" :
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
                    )}>
                      {selectedRecord?.request_status === 'PENDING' ? t('awaitingVerification') : t(getLockStatus(date))}
                    </Badge>
                  )}
                </div>
              </header>

              {selectedRecord ? (
                <div className="space-y-8 text-foreground">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-foreground/[0.02] border border-border/5 hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-micro text-foreground/30">{t('unitVolume')}</span>
                        {selectedRecord.request_status === 'PENDING' && selectedRecord.requested_quantity !== null && (
                          <span className="font-micro text-amber-600 dark:text-amber-400 text-[8px] tracking-widest animate-pulse">{t('target')}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-4xl font-black font-heading italic">
                          {selectedRecord.request_status === 'PENDING' && selectedRecord.requested_quantity !== null
                            ? selectedRecord.requested_quantity
                            : selectedRecord.quantity}
                          <span className="text-sm opacity-20 not-italic font-sans"> L</span>
                        </span>
                        {selectedRecord.request_status === 'PENDING' && selectedRecord.requested_quantity !== null && (
                          <span className="text-[10px] font-micro text-foreground/20 mt-1 line-through decoration-foreground/10 uppercase">Current: {selectedRecord.quantity}L</span>
                        )}
                      </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-foreground/[0.02] border border-border/5 hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-micro text-foreground/30">{t('reserveVar')}</span>
                        {selectedRecord.request_status === 'PENDING' && selectedRecord.requested_extra_qty !== null && (
                          <span className="font-micro text-amber-600 dark:text-amber-400 text-[8px] tracking-widest animate-pulse">{t('target')}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-4xl font-black font-heading italic text-foreground">
                          +{selectedRecord.request_status === 'PENDING' && selectedRecord.requested_extra_qty !== null
                            ? selectedRecord.requested_extra_qty
                            : selectedRecord.extra_qty}
                          <span className="text-sm opacity-20 not-italic font-sans"> L</span>
                        </span>
                        {selectedRecord.request_status === 'PENDING' && selectedRecord.requested_extra_qty !== null && (
                          <span className="text-[10px] font-micro text-foreground/20 mt-1 line-through decoration-foreground/10 uppercase">Current: +{selectedRecord.extra_qty}L</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-micro text-primary">{t('statusVector')}</span>
                        <p className="font-heading font-black italic text-foreground uppercase">{selectedRecord.status}</p>
                      </div>
                    </div>
                    {selectedRecord.request_status === 'PENDING' && (
                      <div className="animate-spin text-primary">
                        <Loader2 size={24} />
                      </div>
                    )}
                  </div>

                  {date && getLockStatus(date) === 'GHOST_EDIT' && (
                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-white font-black italic text-xl tracking-tight transition-all duration-500"
                    >
                      {t('initializeGhost')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center opacity-10">
                  <Lock size={60} className="mx-auto mb-4 text-foreground" />
                  <span className="font-micro tracking-[1em] text-foreground">{t('idleState')}</span>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <ResponsiveDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        className="p-0 sm:max-w-[440px] border-border/10 bg-background/95 dark:bg-black/95 text-foreground rounded-[2.5rem] overflow-hidden shadow-2xl"
        title={<span className="text-3xl font-black font-heading italic uppercase tracking-tighter text-foreground">{t('ghost')} <span className="text-primary italic">{t('mode')}</span></span>}
        description={<span className="font-micro text-foreground/20 tracking-[0.2em] uppercase text-[10px] block mt-2">{t('temporalMod')} {date && format(date, 'yyyy.MM.dd')}</span>}
      >
          <div className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-foreground/10 scrollbar-track-transparent">
            <div className="p-8 sm:p-10 space-y-8">
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-foreground/[0.03] rounded-2xl border border-border/5">
                  <div className="space-y-1">
                    <p className="font-heading font-bold italic uppercase tracking-tight text-foreground">{t('pauseSession')}</p>
                    <p className="font-micro text-foreground/20">{t('suspendDelivery')}</p>
                  </div>
                  <Switch
                    checked={isPaused}
                    onCheckedChange={setIsPaused}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {!isPaused && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-border/5 space-y-4">
                      <div className="flex justify-between items-center text-foreground">
                        <span className="font-micro text-foreground/40 italic">{t('standardVal')}</span>
                        <span className="text-xl font-black italic">{(Number(selectedRecord?.quantity) || dailyTargetQty)} L</span>
                      </div>
                      <Separator className="bg-foreground/5" />
                      <div className="space-y-2">
                        <Label className="font-micro text-primary">{t('reduceAmount')}</Label>
                        <Input
                          type="number"
                          step="0.25"
                          max={(Number(selectedRecord?.quantity) || dailyTargetQty)}
                          className="h-12 bg-foreground/5 border-border/5 rounded-xl font-black italic text-lg text-foreground focus:border-primary/50 transition-colors"
                          value={reduceQty > 0 ? reduceQty : ''}
                          onChange={(e) => setReduceQty(parseFloat(e.target.value) || 0)}
                          placeholder="Amount to subtract (e.g. 0.5)"
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-micro text-emerald-600 dark:text-emerald-400">{t('netYield')}</span>
                        <span className="text-3xl font-black italic text-emerald-600 dark:text-emerald-400">
                          {selectedRecord ? Math.max(0, (Number(selectedRecord.quantity) || dailyTargetQty) - reduceQty) : 0} L
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                      <Label className="font-micro text-primary italic uppercase tracking-wider">{t('preOrderLabel')}</Label>
                      <Input
                        type="number"
                        step="0.25"
                        className="h-12 bg-background/20 dark:bg-black/20 border-border/5 rounded-xl font-black italic text-lg text-foreground px-4 focus:border-primary/50 transition-colors"
                        value={editExtraQty > 0 ? editExtraQty : ''}
                        onChange={(e) => setEditExtraQty(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      <p className="text-[10px] font-micro text-foreground/30 uppercase tracking-widest mt-1">{t('preOrderDesc')}</p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col gap-4 mt-8">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full h-16 bg-primary hover:bg-foreground hover:text-background rounded-2xl font-black italic text-lg shadow-glow-primary/20 transition-all duration-300 gap-3 text-white"
                >
                  {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : <Sparkles className="h-5 w-5" />}
                  {isSaving ? t('synchronizing') : t('executeUpdate')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full font-micro opacity-40 hover:opacity-100 uppercase tracking-widest text-[10px] text-foreground"
                >
                  {t('abortChanges')}
                </Button>
              </DialogFooter>
            </div>
          </div>
      </ResponsiveDialog>
    </div>
  )
}
