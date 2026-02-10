"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  isFuture,
  isPast
} from "date-fns"
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Calendar as CalendarIcon,
  Filter,
  History,
  Info
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { consumptionApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export default function ConsumptionGridPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const monthStr = format(selectedMonth, "yyyy-MM")

  const { data: gridData, isLoading, isError, error } = useQuery({
    queryKey: ["consumption", monthStr],
    queryFn: () => consumptionApi.getGrid(monthStr).then(res => res.data),
    staleTime: 30_000,
    retry: 2,
  })


  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    })
  }, [selectedMonth])

  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const handleExport = async () => {
    try {
      const res = await consumptionApi.export(monthStr)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `consumption_${monthStr}.csv`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      console.error("Export failed", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Consumption</h1>
          <p className="text-muted-foreground">Detailed daily records for all customers.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-900 border rounded-lg overflow-hidden shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-r" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1 flex items-center gap-2 min-w-[140px] justify-center text-sm font-semibold">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {format(selectedMonth, "MMMM yyyy")}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-l" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0 overflow-auto max-h-[calc(100vh-250px)]">
          <Table className="relative border-collapse">
            <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
              <TableRow>
                <TableHead className="sticky left-0 bg-slate-50 dark:bg-slate-800 min-w-[180px] z-20 font-bold border-r">
                  Customer Name
                </TableHead>
                {daysInMonth.map((day) => (
                  <TableHead 
                    key={day.toISOString()} 
                    className={cn(
                      "min-w-[45px] text-center p-2 text-[10px] font-bold uppercase tracking-tighter border-r",
                      isToday(day) && "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{format(day, "eee")}</span>
                      <span className="text-sm">{format(day, "d")}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="min-w-[70px] text-center font-bold bg-slate-100 dark:bg-slate-700">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="sticky left-0 bg-white dark:bg-slate-900 border-r"><Skeleton className="h-4 w-24" /></TableCell>
                    {daysInMonth.map((day) => (
                      <TableCell key={day.toISOString()} className="border-r"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : gridData?.length > 0 ? (
                gridData.map((row: any) => {
                  let rowTotal = 0;
                  return (
                    <TableRow key={row.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="sticky left-0 bg-white dark:bg-slate-900 font-medium border-r z-10 py-3">
                        <div className="flex flex-col">
                          <span>{row.name}</span>
                          <span className="text-[10px] text-muted-foreground leading-none">{row.phone}</span>
                        </div>
                      </TableCell>
                      {daysInMonth.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd")
                        const dayNum = day.getDate()
                        const value = row.daily_liters[dateStr] || 0
                        rowTotal += value
                        const isLocked = isPast(day) && !isToday(day)
                        
                        return (
                          <TableCell 
                            key={dateStr} 
                            className={cn(
                              "text-center p-0 border-r text-sm min-w-[45px]",
                              isToday(day) && "bg-primary/5",
                              isFuture(day) && "bg-slate-50/50 dark:bg-slate-900/50 opacity-40 cursor-not-allowed",
                              isLocked && "bg-slate-50/30 dark:bg-slate-900/10"
                            )}
                          >
                            <div className="h-10 flex items-center justify-center relative group">
                              {value > 0 ? (
                                <div className="flex items-center gap-0.5">
                                  <span className={cn(
                                    "font-bold",
                                    isToday(day) ? "text-primary" : "text-foreground/80"
                                  )}>
                                    {value % 1 === 0 ? value : value.toFixed(1)}
                                  </span>
                                  {row.audits?.[dayNum] && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Info className="h-3 w-3 text-amber-500" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-56 p-3 text-xs" side="top">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-1.5 font-bold text-amber-600">
                                            <History className="h-3 w-3" />
                                            Audit Information
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                            <span className="text-muted-foreground">Admin:</span>
                                            <span className="font-medium">{row.audits[dayNum].modified_by}</span>
                                            <span className="text-muted-foreground">Before:</span>
                                            <span className="font-medium">{row.audits[dayNum].old_val} L</span>
                                            <span className="text-muted-foreground">After:</span>
                                            <span className="font-medium">{row.audits[dayNum].new_val} L</span>
                                            <span className="text-muted-foreground">Date:</span>
                                            <span className="font-medium">{format(new Date(row.audits[dayNum].modified_at), "MMM d, HH:mm")}</span>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                              ) : isLocked ? (
                                <Lock className="h-4 w-4 text-muted-foreground/30" />
                              ) : (
                                <span className="text-muted-foreground/20 italic">-</span>
                              )}
                            </div>
                          </TableCell>
                        )
                      })}
                      <TableCell className="bg-slate-50/80 dark:bg-slate-800/80 text-center font-black text-primary py-3">
                        {rowTotal.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={daysInMonth.length + 2} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <span className="text-red-500 font-medium">Failed to load data</span>
                      <span className="text-sm">Please check your connection and try again</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : gridData?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={daysInMonth.length + 2} className="h-32 text-center text-muted-foreground">
                    No milk consumption data for this month yet. Start by adding entries in Daily Entry.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={daysInMonth.length + 2} className="h-32 text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableBody className="sticky bottom-0 bg-slate-100 dark:bg-slate-800 font-bold z-10 border-t shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
              <TableRow>
                <TableCell className="sticky left-0 bg-slate-100 dark:bg-slate-800 border-r py-4 font-black">
                  DAILY TOTALS
                </TableCell>
                {daysInMonth.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd")
                  const dayTotal = gridData?.reduce((sum: number, row: any) => sum + (row.daily_liters[dateStr] || 0), 0) || 0
                  return (
                    <TableCell key={dateStr} className="text-center border-r text-primary">
                      {dayTotal > 0 ? (dayTotal % 1 === 0 ? dayTotal : dayTotal.toFixed(1)) : "-"}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center text-lg font-black bg-primary text-primary-foreground">
                  {gridData?.reduce((sum: number, row: any) => sum + Object.values(row.daily_liters as Record<string, number>).reduce((s, v) => s + v, 0), 0).toFixed(1)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-6 text-[10px] uppercase font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-primary/20 rounded-sm" /> Today</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-sm" /> Past / Locked</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-50 dark:bg-slate-900 opacity-40 rounded-sm" /> Future</div>
      </div>
    </div>
  )
}
