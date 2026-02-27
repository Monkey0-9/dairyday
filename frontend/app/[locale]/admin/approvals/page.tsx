"use client"
import React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Fingerprint,
  Activity,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"
import { getDateFnsLocale } from "@/lib/i18n-utils"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { consumptionApi } from "@/lib/api"
import { cn, formatApiError } from "@/lib/utils"

/* ─── Premium Components ─── */

const Scanline = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.5)_50%)] bg-[length:100%_4px] animate-scanline" />
  </div>
)

const GlassStat = ({ title, value, icon, gradient, loading }: { title: string; value: string | number; icon: React.ReactNode; gradient: string; loading?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="p-3 rounded-xl glass-card border-white/5 bg-white/[0.02] flex flex-col justify-between group hover:border-primary/20 transition-all duration-700 overflow-hidden relative"
  >
    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-1000 bg-gradient-to-br", gradient)} />
    <div className="flex justify-between items-start relative z-10">
      <div className={cn("h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:border-primary/20 transition-all duration-700 shadow-glow-primary/0 group-hover:shadow-glow-primary/10")}>
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      <p className="font-micro text-[8px] uppercase tracking-[0.2em] text-white/20 italic">{title}</p>
    </div>
    <div className="mt-4 relative z-10">
      {loading ? (
        <Skeleton className="h-6 w-16 bg-white/5" />
      ) : (
        <p className="text-xl font-black font-heading tracking-tight italic text-white uppercase leading-none">{value}</p>
      )}
    </div>
    <Scanline />
  </motion.div>
)

interface PendingRequest {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  current_quantity: number | string;
  requested_quantity: number | string | null;
  current_extra_qty: number | string;
  requested_extra_qty: number | string | null;
  modification_type: string;
  request_note: string | null;
  user_target_qty?: number | string;
}

export default function ApprovalsPage() {
  const t = useTranslations('Admin.dailyEntry')
  const tCommon = useTranslations('Common')
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const queryClient = useQueryClient()

  const { data: requestsData = [], isLoading, refetch, isRefetching } = useQuery<PendingRequest[]>({
    queryKey: ["pending-requests"],
    queryFn: async () => {
      const res = await consumptionApi.getRequests()
      return res.data
    },
    refetchInterval: 30000,
    staleTime: 10_000,
  })

  // Only show PENDING items
  const requests = requestsData.filter(r => r.modification_type !== "PROCESSED" && !r.id.startsWith('dummy')) // Adjust based on actual API behavior if needed, usually just filter by PENDING status if available.
  // Actually, let's just make sure we check for a status field if it exists, or assume if it's in this list, it should be pending.
  // The user wants them gone after action.

  const verifyMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string, approved: boolean }) =>
      consumptionApi.verify(id, approved),
    onSuccess: (data, variables) => {
      toast.success(variables.approved ? t('table.approved') : t('table.rejected'))
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] })
      queryClient.invalidateQueries({ queryKey: ["consumption-grid"] })
    },
    onError: (err) => {
      toast.error(formatApiError(err))
    }
  })

  return (
    <div className="space-y-6 relative">
      <span className="sr-only" aria-hidden="true">{tCommon('accessibility.securityDisclaimer')}</span>
      {/* Cinematic Header Protocol */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-white/[0.05] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary shadow-glow-primary animate-pulse" />
            <span className="font-micro text-[10px] text-primary tracking-[0.4em] uppercase">{t('queueLabel')}</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black font-heading italic uppercase tracking-tighter leading-none">
            {t('title').split(' ')[0]} <span className="text-gradient">{t('title').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-white/40 font-heading font-bold italic text-sm tracking-tight max-w-2xl mt-1">
            {t('subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="h-10 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-primary hover:text-white font-heading font-black italic text-xs uppercase gap-2 transition-all duration-700 shadow-glow-primary/5"
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          {isRefetching ? t('refreshing') : t('refresh').toUpperCase()}
        </Button>
      </header>

      {/* Industrial Stats Container */}
      <div className="grid grid-cols-3 gap-4">
        <GlassStat
          title={t('totalPending')}
          value={isLoading ? "..." : requests.length}
          icon={<Clock />}
          gradient="from-amber-500 to-orange-500"
          loading={isLoading}
        />
        <GlassStat
          title={t('nodeHealth')}
          value={t('nominal')}
          icon={<Activity />}
          gradient="from-blue-500 to-indigo-500"
        />
        <GlassStat
          title={t('authLevel')}
          value={t('adminLevel')}
          icon={<Fingerprint />}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Main Terminal Interface */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl glass-card border-white/5 bg-white/[0.02] overflow-hidden group shadow-2xl"
      >
        <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1 w-4 bg-primary rounded-full shadow-glow-primary" />
            <h2 className="text-lg font-black font-heading tracking-tight uppercase italic text-white/80">{t('verificationTerminal')}</h2>
          </div>
          <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 font-micro text-[8px] uppercase tracking-[0.2em] italic">
            {t('liveNode')}
          </Badge>
        </div>

        <div className="max-h-[800px] overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-white/[0.01]">
              <TableRow className="border-white/[0.05] hover:bg-transparent">
                <TableHead className="px-6 h-10 text-[11px] font-black uppercase tracking-[0.15em] text-white/30 italic">{t('table.dateUser')}</TableHead>
                <TableHead className="h-10 text-[11px] font-black uppercase tracking-[0.15em] text-white/30 italic">{t('table.requested')}</TableHead>
                <TableHead className="h-10 text-[11px] font-black uppercase tracking-[0.15em] text-white/30 italic">{t('table.note')}</TableHead>
                <TableHead className="px-6 text-right h-10 text-[11px] font-black uppercase tracking-[0.15em] text-white/30 italic">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.02]">
                      <TableCell className="px-10 py-10"><Skeleton className="h-12 w-64 bg-white/5 rounded-2xl" /></TableCell>
                      <TableCell><Skeleton className="h-12 w-32 bg-white/5 rounded-2xl" /></TableCell>
                      <TableCell><Skeleton className="h-12 w-48 bg-white/5 rounded-2xl" /></TableCell>
                      <TableCell className="px-10"><Skeleton className="h-12 w-32 bg-white/5 ml-auto rounded-2xl" /></TableCell>
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center gap-8 opacity-10">
                        <ShieldCheck className="h-24 w-24 stroke-[1]" />
                        <p className="font-heading font-black italic text-4xl tracking-[0.5em] uppercase">{t('noPending')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request, idx) => {
                    const typeLabel = request.modification_type || "MODIFICATION"
                    const isExtra = typeLabel === "EXTRA_MILK"
                    const isReduction = typeLabel === "REDUCE_ORDER"
                    const isCancel = typeLabel === "CANCEL_ORDER"

                    const currentQty = Number(request.current_quantity)
                    const requestedQty = request.requested_quantity !== null ? Number(request.requested_quantity) : null
                    const currentExtra = Number(request.current_extra_qty)
                    const requestedExtra = request.requested_extra_qty !== null ? Number(request.requested_extra_qty) : null

                    // Determine request type
                    const isNewExtra = (requestedExtra !== null && requestedExtra > currentExtra);
                    // The original logic for typeLabel was based on derived conditions.
                    // Now it's directly from request.modification_type.
                    // The `typeColor` needs to be mapped from `typeLabel`.
                    let typeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20"; // Default for MODIFICATION

                    if (isCancel) {
                      typeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    } else if (isReduction) {
                      typeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    } else if (isExtra || typeLabel === "MODIFICATION") { // Assuming MODIFICATION also covers pre-order/extra
                      typeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    }

                    return (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group border-white/[0.05] hover:bg-white/[0.02] transition-all duration-500"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/10 group-hover:text-primary group-hover:border-primary/20 transition-all duration-700">
                              <Fingerprint size={18} />
                            </div>
                            <div>
                              <h3 className="text-xl font-heading font-black italic tracking-tight text-white uppercase group-hover:text-primary transition-colors">
                                {request.user_name}
                              </h3>
                              <p className="font-micro text-[8px] text-white/20 uppercase tracking-[0.2em] mt-0.5 italic">
                                {format(new Date(request.date), "dd_MMM_yyyy", { locale: dateFnsLocale })} :: {format(new Date(request.date), "HH:mm", { locale: dateFnsLocale })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <Badge className={cn("w-fit font-micro text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-md border", typeColor)}>
                              {t(`table.${typeLabel.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`)}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="font-micro text-[7px] text-white/20 tracking-widest uppercase">{t('table.from')}</span>
                                <Badge className="bg-white/5 text-white/40 border-white/10 font-black italic h-7 px-2 rounded-lg text-sm">
                                  {(Number(request.current_quantity) || Number(request.user_target_qty) || 1.0) + currentExtra}L
                                </Badge>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <ChevronRight className="text-white/10" size={14} />
                                {isReduction || isCancel ? (
                                  <span className="font-micro text-[7px] text-rose-400 font-bold tracking-tighter">
                                    -{Number(currentQty - (requestedQty ?? currentQty)).toFixed(2)}L
                                  </span>
                                ) : isNewExtra ? (
                                  <span className="font-micro text-[7px] text-emerald-400 font-bold tracking-tighter">
                                    +{Number((requestedExtra ?? currentExtra) - currentExtra).toFixed(2)}L
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-micro text-primary text-[7px] tracking-widest uppercase">{t('table.target')}</span>
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-black italic h-7 px-2 rounded-lg text-sm shadow-glow-primary/5">
                                  {(requestedQty ?? currentQty) + (requestedExtra ?? currentExtra)}L
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="p-2 rounded-xl bg-white/[0.01] border border-white/[0.03] max-w-[200px] group-hover:bg-white/[0.02] transition-colors">
                            <p className="text-[11px] font-heading font-bold italic text-white/40 group-hover:text-white/60 transition-colors leading-tight line-clamp-2">
                              {request.request_note || t('table.noTransmissionNote')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <div className="flex justify-end gap-2 opacity-100 sm:translate-x-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-x-0 transition-all duration-500">
                            <Button
                              className="h-8 px-4 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/20 font-heading font-black italic tracking-tight uppercase text-xs gap-2 transition-all duration-500"
                              onClick={() => verifyMutation.mutate({ id: request.id, approved: true })}
                              disabled={verifyMutation.isPending}
                              aria-label={t('table.approve')}
                            >
                              <CheckCircle2 size={14} aria-hidden="true" />
                              {t('table.approve').toUpperCase()}
                            </Button>
                            <Button
                              className="h-8 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border-rose-500/20 font-heading font-black italic tracking-tight uppercase text-xs gap-2 transition-all duration-500"
                              onClick={() => verifyMutation.mutate({ id: request.id, approved: false })}
                              disabled={verifyMutation.isPending}
                              aria-label={t('table.reject')}
                            >
                              <XCircle size={14} aria-hidden="true" />
                              {t('table.reject').toUpperCase()}
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </motion.section>
    </div>
  )
}
