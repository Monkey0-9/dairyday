"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  isFuture,
  isPast,
  subMonths,
  addMonths,
  subDays
} from "date-fns"
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Calendar as CalendarIcon,
  Search,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react"

import { useTranslation } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { consumptionApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"


interface GridRow {
  user_id: string
  name: string
  phone: string
  daily_liters: Record<string, number>
  audits: Record<string, any>
}

export default function ConsumptionGridPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [search, setSearch] = useState("")
  const [editingCell, setEditingCell] = useState<{ userId: string, date: string } | null>(null)
  const { t } = useTranslation()
  
  const queryClient = useQueryClient()
  const monthStr = format(selectedMonth, "yyyy-MM")
  const LOCK_DAYS = 7 // Matches backend settings

  // Fetch Data
  const { data: gridData, isLoading } = useQuery({
    queryKey: ["consumption", monthStr],
    queryFn: () => consumptionApi.getGrid(monthStr).then(res => res.data),
    staleTime: 60 * 1000, 
  })

  // Mutation for Saving
  const updateMutation = useMutation({
    mutationFn: (data: any) => consumptionApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption", monthStr] })
      toast.success("Saved", { duration: 1000 })
      setEditingCell(null)
    },
    onError: (err: any) => {
        toast.error("Failed to save: " + (err.response?.data?.detail || err.message))
    }
  })

  // Date Logic
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    })
  }, [selectedMonth])

  // Computed Totals
  const totals = useMemo(() => {
    if (!gridData) return { rows: {}, cols: {}, grand: 0 }
    
    const rowTotals: Record<string, number> = {}
    const colTotals: Record<string, number> = {}
    let grandTotal = 0

    gridData.forEach((row: GridRow) => {
      // Filter logic applies here too for totals consistency
      if (search && !row.name.toLowerCase().includes(search.toLowerCase()) && !row.phone.includes(search)) return

      let rTotal = 0
      Object.entries(row.daily_liters).forEach(([date, qty]) => {
        rTotal += qty
        colTotals[date] = (colTotals[date] || 0) + qty
        grandTotal += qty
      })
      rowTotals[row.user_id] = rTotal
    })

    return { rows: rowTotals, cols: colTotals, grand: grandTotal }
  }, [gridData, search])

  const filteredData = useMemo(() => {
    if (!gridData) return []
    return gridData.filter((row: GridRow) => 
      row.name.toLowerCase().includes(search.toLowerCase()) || 
      row.phone.includes(search)
    )
  }, [gridData, search])

  // Handlers
  const handleCellClick = (userId: string, dateStr: string, isLocked: boolean) => {
    if (isLocked) return
    setEditingCell({ userId, date: dateStr })
  }

  const handleSave = (userId: string, dateStr: string, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) && value !== "") return 
    
    const quantity = value === "" ? 0 : numValue

    updateMutation.mutate({
        user_id: userId,
        date: dateStr,
        quantity: quantity
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, userId: string, dateStr: string, value: string) => {
      if (e.key === "Enter") {
          e.currentTarget.blur()
      }
      if (e.key === "Escape") {
          setEditingCell(null)
      }
  }

  const handleExport = async () => {
    try {
      const res = await consumptionApi.export(monthStr)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `consumption_${monthStr}.csv`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      toast.error("Export failed")
    }
  }

  const handleExportPdf = async () => {
    try {
      const res = await consumptionApi.exportPdf(monthStr)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `consumption_report_${monthStr}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success("PDF Report downloaded")
    } catch (error) {
           toast.error("Export failed")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-0 z-40 bg-black/80 backdrop-blur-md py-4 border-b border-white/10 -mx-6 px-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {t('monthlyConsumption')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('recordsSub')}</p>
            </div>

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder={t('searchCustomers')}
                        className="pl-9 h-10 w-[200px] md:w-[300px] bg-white/5 border-white/10 text-white focus:ring-indigo-500 focus:border-indigo-500 rounded-lg placeholder:text-muted-foreground/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Month Selector */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden p-1 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="px-4 text-sm font-semibold min-w-[120px] text-center text-white">
                        {format(selectedMonth, "MMMM yyyy")}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Export */}
                <div className="flex gap-2">
                    <Button 
                        onClick={handleExportPdf}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border-none transition-all hover:scale-105"
                    >
                        <FileText className="mr-2 h-4 w-4" /> 
                        <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Button 
                        onClick={handleExport}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border-none transition-all hover:scale-105"
                    >
                        <Download className="mr-2 h-4 w-4" /> 
                        <span className="hidden sm:inline">CSV</span>
                    </Button>
                </div>
            </div>
        </div>

        {/* Mobile Search (visible only on small screens) */}
        <div className="md:hidden">
            <Input 
                placeholder={t('searchCustomers')}
                className="w-full bg-white/5 border-white/10 text-white focus:ring-indigo-500 rounded-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        {/* The Grid Card */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden rounded-xl ring-1 ring-white/5">
            <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <table className="w-full border-collapse text-left text-sm">
                        {/* Header Row */}
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="sticky left-0 top-0 z-30 bg-[#0a0a0a] min-w-[180px] p-4 font-semibold text-white border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                    {t('name')}
                                </th>
                                {daysInMonth.map((day) => {
                                    const isT = isToday(day)
                                    return (
                                        <th 
                                            key={day.toISOString()} 
                                            className={cn(
                                                "sticky top-0 z-20 min-w-[60px] p-2 text-center border-r border-white/5 bg-[#0a0a0a]",
                                                isT && "bg-indigo-900/20 text-indigo-400 box-content border-b-2 border-b-indigo-500"
                                            )}
                                        >
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, "EEE")}</div>
                                            <div className="text-sm font-bold">{format(day, "d")}</div>
                                        </th>
                                    )
                                })}
                                <th className="sticky top-0 z-20 min-w-[80px] p-4 text-center bg-[#0a0a0a] font-bold text-emerald-400 border-l border-white/10">
                                    {t('total')}
                                </th>
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan={daysInMonth.length + 2} className="p-8 text-center text-muted-foreground">{t('loading')}</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={daysInMonth.length + 2} className="p-8 text-center text-muted-foreground">{t('noCustomersFound')}</td></tr>
                            ) : (
                                filteredData.map((row: GridRow) => (
                                    <tr key={row.user_id} className="group hover:bg-white/5 transition-colors">
                                        {/* Sticky Name Column */}
                                        <td className="sticky left-0 z-10 bg-[#0a0a0a] group-hover:bg-[#111] p-3 border-r border-white/10 font-medium text-white shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                            <div className="flex flex-col">
                                                <span className="truncate max-w-[150px]">{row.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{row.phone}</span>
                                            </div>
                                        </td>
                                        
                                        {/* Days */}
                                        {daysInMonth.map((day) => {
                                            const dateStr = format(day, "yyyy-MM-dd")
                                            const val = row.daily_liters[dateStr] || 0
                                            const isT = isToday(day)
                                            // Lock logic: explicit lock or older than 7 days
                                            const isLocked = isPast(day) && !isToday(day) && (subDays(new Date(), LOCK_DAYS) > day)
                                            const isEditing = editingCell?.userId === row.user_id && editingCell?.date === dateStr

                                            return (
                                                <td 
                                                    key={dateStr}
                                                    className={cn(
                                                        "p-0 border-r border-white/5 text-center relative h-12 min-w-[60px]",
                                                        isT && "bg-indigo-900/10",
                                                        isLocked ? "bg-white/5 cursor-not-allowed" : "cursor-pointer hover:bg-indigo-500/10"
                                                    )}
                                                    onClick={() => handleCellClick(row.user_id, dateStr, isLocked)}
                                                >
                                                    {isEditing ? (
                                                        <input 
                                                            autoFocus
                                                            defaultValue={val === 0 ? "" : val}
                                                            type="number"
                                                            step="0.5"
                                                            className="w-full h-full bg-indigo-900/50 text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 absolute inset-0 text-sm font-bold"
                                                            onBlur={(e) => handleSave(row.user_id, dateStr, e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, row.user_id, dateStr, e.currentTarget.value)}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full w-full">
                                                            {isLocked && val === 0 ? (
                                                                <span className="text-white/10 text-xs">-</span>
                                                            ) : isLocked ? (
                                                                <div className="flex items-center gap-1 text-white/50" title="Locked">
                                                                     <Lock className="h-3 w-3 opacity-50" />
                                                                     <span className="text-xs">{val}</span>
                                                                </div>
                                                            ) : val === 0 ? (
                                                                <span className="text-white/20">-</span>
                                                            ) : (
                                                                <span className={cn(
                                                                    "font-bold transition-all", 
                                                                    isT ? "text-indigo-400 text-base" : "text-white text-sm"
                                                                )}>
                                                                    {val}
                                                                </span>
                                                            )}
                                                            
                                                            {/* Audit Dot */}
                                                            {row.audits?.[day.getDate()] && (
                                                                <div className="absolute top-1 right-1 h-1 w-1 rounded-full bg-amber-500" title="Edited by Admin" />
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}

                                        {/* Row Total */}
                                        <td className="p-3 text-center font-bold text-emerald-400 bg-emerald-900/5 border-l border-white/10">
                                            {totals.rows[row.user_id] % 1 === 0 ? totals.rows[row.user_id] : totals.rows[row.user_id].toFixed(1)}   
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        
                        {/* Footer (Grand Totals) */}
                        {!isLoading && filteredData.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-white/20 bg-[#111] font-bold">
                                    <td className="sticky left-0 bottom-0 z-30 bg-[#111] p-4 text-right text-muted-foreground border-r border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                        {t('total').toUpperCase()}
                                    </td>
                                    {daysInMonth.map((day) => {
                                        const dateStr = format(day, "yyyy-MM-dd")
                                        const total = totals.cols[dateStr] || 0
                                        return (
                                            <td key={dateStr} className="p-2 text-center text-white/80 border-r border-white/10">
                                                {total > 0 ? (total % 1 === 0 ? total : total.toFixed(1)) : "-"}
                                            </td>
                                        )
                                    })}
                                    <td className="p-4 text-center text-emerald-400 text-lg border-l border-white/10 bg-emerald-900/10">
                                        {totals.grand % 1 === 0 ? totals.grand : totals.grand.toFixed(1)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
