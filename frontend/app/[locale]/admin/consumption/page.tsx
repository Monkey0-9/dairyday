"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isToday,
    subMonths,
    addMonths,
} from "date-fns"
import {
    Download,
    ChevronLeft,
    ChevronRight,
    Lock,
    LockOpen,
    Search,
    Trash2,
    Activity,
} from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyGridState } from "@/components/ui/empty-state"
import { GridSkeleton } from "@/components/skeletons"
import { PremiumErrorState } from "@/components/ui/state-displays"
import { consumptionApi, usersApi, adminApi } from "@/lib/api"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

// ----------------------------------------------------------------------
// TYPES & HELPERS
// ----------------------------------------------------------------------

interface ConsumptionRecord {
    user_id: string
    name: string
    email?: string
    phone: string
    daily_liters: Record<string, number>
    audits?: Record<number, unknown>
    is_locked?: boolean
}

// ----------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------

export default function ConsumptionGridPage() {
    const t = useTranslations("Admin.consumption")
    const queryClient = useQueryClient()
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [searchQuery, setSearchQuery] = useState("")

    const monthStr = format(selectedMonth, "yyyy-MM")

    // --- QUERY ---
    const { data: gridData = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["consumption", monthStr],
        queryFn: () => consumptionApi.getGrid(monthStr).then(res => res.data),
        staleTime: 30_000,
    })

    // --- MUTATIONS ---
    const lockMutation = useMutation({
        mutationFn: (userId: string) => adminApi.lock(monthStr, userId),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["consumption", monthStr] })
            toast.success(res.data.message || "Locked successfully")
        },
        onError: () => toast.error("Failed to lock records")
    })

    const unlockMutation = useMutation({
        mutationFn: (userId: string) => adminApi.unlock(monthStr, userId),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["consumption", monthStr] })
            toast.success(res.data.message || "Unlocked successfully")
        },
        onError: () => toast.error("Failed to unlock records")
    })

    const updateMutation = useMutation({
        mutationFn: (data: { user_id: string; date: string; quantity: number; extra_qty?: number; status?: string; note?: string }) => consumptionApi.upsert(data),
        onMutate: async (newData) => {
            await queryClient.cancelQueries({ queryKey: ["consumption", monthStr] })
            const previousGridData = queryClient.getQueryData<ConsumptionRecord[]>(["consumption", monthStr])
            queryClient.setQueryData<ConsumptionRecord[]>(["consumption", monthStr], (old) => {
                if (!old) return []
                return old.map(record => {
                    if (record.user_id === newData.user_id) {
                        return {
                            ...record,
                            daily_liters: {
                                ...record.daily_liters,
                                [newData.date]: newData.quantity
                            }
                        }
                    }
                    return record
                })
            })
            return { previousGridData }
        },
        onError: (err: { response?: { data?: { detail?: string } } }, _newData, context) => {
            queryClient.setQueryData(["consumption", monthStr], context?.previousGridData)
            const msg = err.response?.data?.detail || "Failed to update record"
            toast.error(msg)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["consumption", monthStr] })
        },
        onSuccess: () => {
            toast.success(t('syncComplete'))
        }
    })

    const deleteUserMutation = useMutation({
        mutationFn: (userId: string) => usersApi.delete(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["consumption", monthStr] })
            toast.success("Customer deleted")
        },
        onError: () => toast.error("Failed to delete customer")
    })

    // --- COMPUTED ---
    const daysInMonth = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(selectedMonth),
            end: endOfMonth(selectedMonth),
        })
    }, [selectedMonth])

    const filteredData = useMemo(() => {
        if (!gridData) return []
        return gridData.filter((row: ConsumptionRecord) =>
            row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.phone.includes(searchQuery)
        )
    }, [gridData, searchQuery])

    // --- HANDLERS ---
    const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1))
    const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1))

    const handleExport = async () => {
        const promise = consumptionApi.export(monthStr)
        toast.promise(promise, {
            loading: 'Generating report...',
            success: 'Export downloaded',
            error: 'Export failed'
        })

        try {
            const res = await promise
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `consumption_${monthStr}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch { }
    }

    const handleCellEdit = (userId: string, dateObj: Date, value: string) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue) || numValue < 0) return

        updateMutation.mutate({
            user_id: userId,
            date: format(dateObj, "yyyy-MM-dd"),
            quantity: numValue,
            extra_qty: 0,
            status: "DELIVERED",
            note: "Admin Update"
        })
    }

    // --- RENDER ---

    return (
        <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[50%] bg-indigo-900/10 blur-[150px] rounded-full opacity-40 animate-pulse-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900/10 blur-[120px] rounded-full opacity-30" />
            </div>

            <div className="relative z-10 p-2 lg:p-4 space-y-2 lg:space-y-4 max-w-[1600px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/5 border border-white/10 p-1.5 rounded-lg backdrop-blur-md">
                                <Activity className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
                                    {t('title').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">{t('title').split(' ').slice(1).join(' ')}</span>
                                </h1>
                                <p className="text-white/40 font-bold text-[9px] tracking-widest uppercase">{t('subtitle')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 pl-3 backdrop-blur-md">
                            <span className="font-mono text-[10px] text-indigo-300 font-bold uppercase tracking-widest mr-1">
                                {format(selectedMonth, "MMM yyyy")}
                            </span>
                            <div className="flex gap-0.5">
                                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7 rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <Button onClick={handleExport} className="h-8 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full px-4 text-xs font-bold transition-all active:scale-95">
                            <Download className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                            {t('export')}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-white/5 border-white/5 focus:border-indigo-500/50 rounded-xl text-[13px] text-white placeholder:text-white/20 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 opacity-50 pointer-events-none" />
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="sticky left-0 z-20 bg-[#0a0a0e] p-3 min-w-[160px] font-bold text-white/40 text-[10px] uppercase tracking-widest border-r border-white/5 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                        {t('customer')}
                                    </th>
                                    {daysInMonth.map(day => (
                                        <th key={day.toString()} className={cn(
                                            "p-1.5 min-w-[40px] text-center text-[9px] font-black uppercase tracking-tighter border-r border-white/5",
                                            isToday(day) ? "bg-indigo-500/20 text-indigo-300" : "text-white/20"
                                        )}>
                                            <div className="flex flex-col gap-0">
                                                <span>{format(day, "EEE").charAt(0)}</span>
                                                <span className="text-xs font-sans">{format(day, "d")}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="sticky right-0 z-20 bg-[#0a0a0e] p-3 font-bold text-indigo-400 text-[10px] uppercase tracking-widest border-l border-white/5 shadow-[-4px_0_12px_rgba(0,0,0,0.5)]">
                                        {t('actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={daysInMonth.length + 2} className="p-0">
                                            <GridSkeleton />
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={daysInMonth.length + 2} className="h-[400px] text-center border-none p-0">
                                            <EmptyGridState />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((row: ConsumptionRecord) => (
                                        <motion.tr
                                            key={row.user_id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row"
                                        >
                                            <td className="sticky left-0 z-10 bg-[#0a0a0e] p-2 lg:p-3 border-r border-white/5 group-hover/row:bg-[#0f0f13] transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white text-[13px] truncate max-w-[140px] uppercase italic tracking-tight">{row.name}</span>
                                                    <span className="text-white/70 text-[11px] font-mono tracking-wide mt-0.5">{row.email || row.user_id}</span>
                                                    <span className="text-indigo-400/60 text-[9px] font-mono tracking-wider">{row.phone}</span>
                                                </div>
                                            </td>

                                            {daysInMonth.map(day => {
                                                const dateStr = format(day, "yyyy-MM-dd")
                                                const qty = row.daily_liters[dateStr] || 0
                                                const locked = row.is_locked

                                                return (
                                                    <td key={dateStr} className={cn(
                                                        "p-1 border-r border-white/5 relative text-center",
                                                        locked ? "bg-white/[0.01]" : ""
                                                    )}>
                                                        {locked ? (
                                                            <div className="flex items-center justify-center h-10 w-full opacity-20">
                                                                {qty > 0 ? (
                                                                    <span className="font-mono text-white font-bold">{qty}</span>
                                                                ) : (
                                                                    <Lock className="w-3 h-3 text-white/50" />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className={cn(
                                                                "h-8 w-full rounded-md flex items-center justify-center transition-all cursor-pointer",
                                                                qty > 0 ? "bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20" : "text-white/5 hover:bg-white/10"
                                                            )}>
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-full bg-transparent text-center focus:outline-none focus:bg-white focus:text-black font-mono font-bold text-[13px] rounded-md transition-colors"
                                                                    placeholder="-"
                                                                    defaultValue={qty || ""}
                                                                    onBlur={(e) => {
                                                                        const val = e.target.value
                                                                        if (val !== String(qty)) {
                                                                            handleCellEdit(row.user_id, day, val || "0")
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') e.currentTarget.blur()
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })}

                                            <td className="sticky right-0 z-10 bg-[#0a0a0e] p-2 border-l border-white/5 text-center group-hover/row:bg-[#0f0f13] shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
                                                <div className="flex items-center justify-center gap-1">
                                                    {row.is_locked ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => unlockMutation.mutate(row.user_id)}
                                                            className="text-amber-500/40 hover:text-amber-500 hover:bg-amber-500/10 rounded-full h-8 w-8"
                                                            title="Unlock"
                                                        >
                                                            <LockOpen className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => lockMutation.mutate(row.user_id)}
                                                            className="text-indigo-500/40 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-full h-8 w-8"
                                                            title="Lock"
                                                        >
                                                            <Lock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-full h-8 w-8">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-zinc-950 border border-white/10 text-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-white/60">
                                                                    {t('deleteDesc', { name: row.name })}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-white/5 text-white border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => deleteUserMutation.mutate(row.user_id)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                                >
                                                                    {t('deleteConfirm')}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>

                            <tfoot className="sticky bottom-0 z-30 bg-[#0a0a0e] border-t border-indigo-500/20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                                <tr>
                                    <td className="p-2 lg:p-3 font-black text-indigo-400 text-[10px] uppercase tracking-widest sticky left-0 bg-[#0a0a0e] border-r border-white/5">
                                        {t('totals')}
                                    </td>
                                    {daysInMonth.map(day => {
                                        const dateStr = format(day, "yyyy-MM-dd")
                                        const total = filteredData.reduce((sum: number, row: ConsumptionRecord) => {
                                            return sum + (row.daily_liters[dateStr] || 0)
                                        }, 0)
                                        return (
                                            <td key={dateStr} className="p-2 text-center border-r border-white/5">
                                                <span className={cn(
                                                    "font-mono font-bold text-xs",
                                                    total > 0 ? "text-indigo-400" : "text-white/10"
                                                )}>
                                                    {total > 0 ? (total % 1 === 0 ? total : total.toFixed(1)) : "-"}
                                                </span>
                                            </td>
                                        )
                                    })}
                                    <td className="sticky right-0 bg-[#0a0a0e]" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="flex items-center gap-6 justify-center text-[10px] uppercase font-bold tracking-widest text-white/40">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        <span>{t('delivered')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-white/20 bg-transparent" />
                        <span>{t('empty')}</span>
                    </div>
                    {isError && (
                         <PremiumErrorState
                             message={t('fetchError')}
                             onRetry={() => refetch()}
                         />
                    )}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-3 h-3">
                            <Lock className="w-3 h-3 text-white/30" />
                        </div>
                        <span>{t('locked')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
