"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams, CellStyle } from "ag-grid-community"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, RefreshCw, Download, Calendar, Filter, Lock, 
  CheckCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight, Info, FileText
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface AuditLog {
  id: number
  user_id: string
  date: string
  oldValue: any
  newValue: any
  timestamp: Date
  status: "success" | "error" | "pending"
}

interface ConsumptionRow {
  user_id: string
  user_name: string
  [key: string]: any
}

export default function ConsumptionGrid() {
  const { theme } = useTheme()
  const [rowData, setRowData] = useState<ConsumptionRow[]>([])
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [quickFilterText, setQuickFilterText] = useState("")
  const [pinnedBottomRowData, setPinnedBottomRowData] = useState<ConsumptionRow[]>([])
  const inputMonthRef = useRef<HTMLInputElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const gridTheme = useMemo(() => {
    return theme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"
  }, [theme])

  const today = useMemo(() => new Date(), [])
  
  // Calculate day status
  const getDayStatus = useCallback((day: number) => {
    const dateStr = `${month}-${String(day).padStart(2, "0")}`
    const date = new Date(dateStr + "T00:00:00")
    const diffTime = today.getTime() - date.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    
    if (diffDays < 0) return "future"
    if (diffDays <= 7) return "editable"
    return "locked"
  }, [month, today])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    suppressHeaderKeyboardTraversal: true,
    headerClass: "font-semibold tracking-wide",
    cellClass: "text-sm font-tabular-nums",
  }), [])

  const fetchGridData = useCallback(async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const res = await axios.get(`${API_URL}/consumption/grid?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = res.data

      if (!data || data.length === 0) {
        setRowData([])
        setPinnedBottomRowData([])
        setColumnDefs([])
        setIsLoading(false)
        return
      }

      const transformed = data.map((row: any) => {
        const newRow: ConsumptionRow = { user_id: row.user_id, user_name: row.user_name }
        Object.keys(row.days || {}).forEach(day => {
          newRow[`day_${day}`] = row.days[day]
        })
        Object.keys(row.audits || {}).forEach(day => {
          newRow[`audit_${day}`] = row.audits[day]
        })
        return newRow
      })
      setRowData(transformed)

      const daysInMonth = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).getDate()

      const baseCols: ColDef[] = [
        {
          field: "user_name",
          headerName: "Customer",
          pinned: "left",
          width: 200,
          filter: true,
          sortable: true,
          resizable: true,
          cellClass: "font-medium",
        }
      ]

      const dayCols: ColDef[] = []
      const todayDate = today.getDate()
      const currentMonth = month

      for (let i = 1; i <= daysInMonth; i++) {
        const status = getDayStatus(i)
        const isEditable = status === "editable"
        const isLocked = status === "locked"
        const isFuture = status === "future"
        const isToday = currentMonth === new Date().toISOString().slice(0, 7) && i === todayDate

        dayCols.push({
          field: `day_${i}`,
          headerName: `${i}`,
          width: 55,
          editable: isEditable,
          cellStyle: (params): CellStyle => {
            const base: CellStyle = {
              transition: "all 0.2s ease",
            }
            
            if (isLocked) {
              return {
                ...base,
                opacity: 0.8,
                backgroundColor: theme === "dark" 
                  ? "rgba(55, 65, 81, 0.4)" 
                  : "rgba(239, 68, 68, 0.08)",
                cursor: "not-allowed",
              }
            }
            
            if (isFuture) {
              return {
                ...base,
                opacity: 0.4,
                backgroundColor: "transparent",
                cursor: "not-allowed",
              }
            }
            
            if (isToday) {
              return {
                ...base,
                backgroundColor: theme === "dark"
                  ? "rgba(234, 179, 8, 0.15)"
                  : "rgba(234, 179, 8, 0.1)",
                borderLeft: "2px solid rgb(234, 179, 8)",
              }
            }
            
            if (isEditable) {
              return {
                ...base,
                cursor: "text",
              }
            }
            
            return base
          },
          cellRenderer: (params: any) => {
            const value = params.value
            const dayStr = params.colDef.field?.replace("day_", "") || "0"
            const day = parseInt(dayStr)
            const status = getDayStatus(day)
            const isLocked = status === "locked"
            const isFuture = status === "future"
            const audit = params.data[`audit_${day}`]

            if (isFuture) {
              return (
                <div className="flex items-center justify-center h-full text-muted-foreground/40">
                  —
                </div>
              )
            }

            return (
              <div 
                className={cn(
                  "flex items-center justify-center h-full w-full relative px-1",
                  audit && "box-border border border-red-500/50 bg-red-500/10"
                )}
                title={audit ? `Edited by ${audit.modified_by}\nOn: ${new Date(audit.modified_at).toLocaleString()}\nOld: ${audit.old_val} -> New: ${audit.new_val}` : (isLocked ? "Locked (>7 days)" : undefined)}
              >
                {value !== null && value !== undefined && value !== "" ? (
                   <span className={cn(
                     "font-mono font-medium transition-all",
                     value > 0 ? "text-foreground" : "text-muted-foreground/60",
                     audit && "text-red-600 dark:text-red-400 font-bold"
                   )}>
                     {Number(value).toFixed(2).replace(/\.00$/, '')}
                   </span>
                ) : (
                   isLocked ? <span className="text-muted-foreground/30">-</span> : ""
                )}

                {isLocked && (
                    <Lock className="h-2.5 w-2.5 absolute top-0.5 right-0.5 opacity-40 text-red-500" />
                )}
                
                {audit && (
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-red-500 rounded-full" />
                )}
              </div>
            )
          },
          valueParser: (params: any) => {
            const val = params.newValue
            if (val === "" || val === null) return null
            const num = Number(val)
            if (isNaN(num)) return params.oldValue
            return Math.max(0, num)
          },
          valueFormatter: (params: ValueFormatterParams) => {
            if (params.value === null || params.value === undefined) return ""
            return Number(params.value).toFixed(2)
          },
          tooltipValueGetter: (params: any) => {
            const day = params.colDef.field?.replace("day_", "")
            const dateStr = `${month}-${String(day).padStart(2, "0")}`
            const value = params.value
            const status = getDayStatus(parseInt(day || "0"))
            
            if (status === "locked") return `${dateStr} • Locked (>7 days)`
            if (status === "future") return `${dateStr} • Future entry`
            return `${dateStr} • ${value || 0}L`
          },
        })
      }

      const totalCol: ColDef = {
        headerName: "Total",
        valueGetter: (params: any) => {
          let total = 0
          Object.keys(params.data).forEach(key => {
            if (key.startsWith("day_")) {
              const val = Number(params.data[key] || 0)
              total += val
            }
          })
          return total
        },
        width: 90,
        pinned: "right",
        valueFormatter: (params: ValueFormatterParams) => params.value?.toFixed(2) || "0.00",
        cellClass: "font-semibold font-mono",
        headerClass: "font-semibold",
      }

      const cols: ColDef[] = [...baseCols, ...dayCols, totalCol]
      setColumnDefs(cols)

      const grandTotal = transformed.reduce((acc: number, r: ConsumptionRow) => {
        let t = 0
        Object.keys(r).forEach(k => {
          if (k.startsWith("day_")) t += Number(r[k] || 0)
        })
        return acc + t
      }, 0)

      const emptyDays: Record<string, null> = {}
      for (let i = 1; i <= daysInMonth; i++) {
        emptyDays[`day_${i}`] = null
      }

      setPinnedBottomRowData([{
        user_id: "__summary__",
        user_name: "Total",
        ...emptyDays,
        total: grandTotal
      } as ConsumptionRow])

    } catch (error) {
      console.error("Failed to fetch grid data", error)
      toast.error("Failed to load consumption data")
    } finally {
      setIsLoading(false)
    }
  }, [month, API_URL, token, theme, getDayStatus, today])

  useEffect(() => {
    fetchGridData()
  }, [fetchGridData])

  const onCellValueChanged = async (event: any) => {
    const { data, colDef, newValue, oldValue } = event
    if (newValue === oldValue || newValue === null) return

    const day = colDef.field?.replace("day_", "")
    if (!day) return

    const dateStr = `${month}-${day.padStart(2, "0")}`
    const newVal = newValue === "" ? null : Number(newValue)

    const logId = Date.now()
    const newLog: AuditLog = {
      id: logId,
      user_id: data.user_id,
      date: dateStr,
      oldValue,
      newValue: newVal,
      timestamp: new Date(),
      status: "pending"
    }

    setAuditLog(prev => [newLog, ...prev])
    setIsSaving(true)

    try {
      await axios.patch(`${API_URL}/consumption/`, {
        user_id: data.user_id,
        date: dateStr,
        quantity: newVal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setAuditLog(prev => prev.map(log =>
        log.id === logId ? { ...log, status: "success" } : log
      ))

      // Refresh totals
      fetchGridData()

      toast.success("Entry saved", {
        description: `${data.user_name}: ${dateStr} → ${newVal}L`
      })

    } catch (error: any) {
      console.error("Update failed", error)

      // Revert change in grid
      if (gridApi && colDef.field) {
        const rowNode = gridApi.getRowNode(data.user_id)
        if (rowNode) {
          rowNode.setDataValue(colDef.field, oldValue)
          gridApi.refreshCells({ rowNodes: [rowNode], force: true })
        }
      }

      setAuditLog(prev => prev.map(log =>
        log.id === logId ? { ...log, status: "error" } : log
      ))

      toast.error("Failed to save", {
        description: error.response?.data?.detail || "Entry is locked (>7 days old)"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/consumption/export?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `consumption_${month}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed", error)
      toast.error("Export failed")
    }
  }
  
  const handleExportSpreadsheet = () => {
    try {
      const [yearStr, monthStr] = month.split("-")
      const year = parseInt(yearStr, 10)
      const monthNum = parseInt(monthStr, 10)
      const daysInMonth = new Date(year, monthNum, 0).getDate()
      
      const headers: string[] = ["id", "name"]
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${month}-${String(i).padStart(2, "0")}`
        headers.push(dateStr)
      }
      headers.push("total_liters")
      
      const escape = (val: any) => {
        if (val === null || val === undefined) return ""
        const str = String(val)
        if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      
      const rows = rowData.map((r) => {
        const values: (string | number)[] = [r.user_id, r.user_name]
        let total = 0
        for (let i = 1; i <= daysInMonth; i++) {
          const val = Number(r[`day_${i}`] ?? 0)
          values.push(val ? Number(val.toFixed(2)) : "")
          total += val
        }
        values.push(Number(total.toFixed(2)))
        return values.map(escape).join(",")
      })
      
      const csv = [headers.join(","), ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `consumption_spreadsheet_${month}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success("Spreadsheet exported")
    } catch (e) {
      console.error("Client export failed", e)
      toast.error("Export failed")
    }
  }

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(18)
      doc.text("Consumption Report", 14, 20)
      
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`Month: ${month}`, 14, 30)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35)

      const [yearStr, monthStr] = month.split("-")
      const year = parseInt(yearStr, 10)
      const monthNum = parseInt(monthStr, 10)
      const daysInMonth = new Date(year, monthNum, 0).getDate()

      const head = [["Customer", "Total"]]
      const body = rowData.map(row => {
        let total = 0
        for (let i = 1; i <= daysInMonth; i++) {
          total += Number(row[`day_${i}`] || 0)
        }
        return [row.user_name, total.toFixed(2)]
      })

      // Calculate grand total
      const grandTotal = body.reduce((acc, row) => acc + Number(row[1]), 0)
      body.push(["GRAND TOTAL", grandTotal.toFixed(2)])

      autoTable(doc, {
        head: head,
        body: body,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }, // Slate 900
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 40, halign: 'right' },
        },
      })

      doc.save(`consumption-report-${month}.pdf`)
      toast.success("PDF exported")
    } catch (error) {
      console.error("PDF export failed", error)
      toast.error("Failed to generate PDF")
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, m] = month.split("-").map(Number)
    let newMonth: number
    let newYear = year
    
    if (direction === 'prev') {
      newMonth = m - 1
      if (newMonth < 1) {
        newMonth = 12
        newYear -= 1
      }
    } else {
      newMonth = m + 1
      if (newMonth > 12) {
        newMonth = 1
        newYear += 1
      }
    }
    
    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, "0")}`
    setMonth(newMonthStr)
  }

  // Status Legend Component
  const StatusLegend = () => (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-red-100 border border-red-200 flex items-center justify-center">
          <Lock className="h-2.5 w-2.5 text-red-500" />
        </div>
        <span className="text-muted-foreground">Locked (&gt;7 days)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
        <span className="text-muted-foreground">Today</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center">
          <span className="text-gray-400 text-xs">—</span>
        </div>
        <span className="text-muted-foreground">Future</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        <span className="text-muted-foreground">Saved</span>
      </div>
    </div>
  )

  // Loading overlay
  if (isLoading && rowData.length === 0) {
    return (
      <div className="container py-6 md:py-8 h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Consumption Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage daily milk delivery records.</p>
        </div>
        <Card className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading consumption data...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 md:py-8 h-[calc(100vh-3.5rem)] flex flex-col animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Consumption Management</h1>
          <p className="text-sm text-muted-foreground">Manage daily milk delivery records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter customers..."
              value={quickFilterText}
              onChange={(e) => {
                setQuickFilterText(e.target.value)
                gridApi?.setGridOption("quickFilterText", e.target.value)
              }}
              className="pl-9 w-64 bg-background"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputMonthRef}
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border-0 focus-visible:ring-0 w-auto bg-transparent h-7 text-sm font-medium"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              disabled={month >= new Date().toISOString().slice(0, 7)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button
            onClick={() => fetchGridData()}
            variant="outline"
            size="icon"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {/* Export buttons */}
          <div className="h-6 w-px bg-border" />
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 hidden md:flex">
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="h-9">
             <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button onClick={handleExportSpreadsheet} variant="default" size="sm" className="h-9">
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4">
        <StatusLegend />
      </div>

      {/* Grid */}
      <div className="flex-1 w-full min-h-0 premium-card rounded-xl shadow-elev-2">
        <div className={cn("h-full w-full overflow-hidden p-1", gridTheme)}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onCellValueChanged={onCellValueChanged}
            onGridReady={(params: GridReadyEvent) => {
              setGridApi(params.api)
            }}
            onFirstDataRendered={(e: any) => {
              e.api.sizeColumnsToFit()
            }}
            pagination={true}
            paginationPageSize={20}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            enableCellTextSelection={true}
            animateRows={true}
            getRowId={(params) => params.data.user_id}
            pinnedBottomRowData={pinnedBottomRowData}
            tooltipShowDelay={0}
            enableBrowserTooltips={true}
            overlayNoRowsTemplate={`<div class="flex items-center justify-center h-full w-full text-center p-8"><div class="space-y-2"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto h-12 w-12 text-muted-foreground"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><h3 class="text-lg font-semibold">No consumption data</h3><p class="text-sm text-muted-foreground max-w-sm">No entries for ${month}. Enter today's data or import a CSV to get started.</p></div></div>`}
            overlayLoadingTemplate={`<div class="flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Loading...</span></div>`}
          />
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-4 flex items-center justify-between text-xs border-t pt-4">
        <div className="flex items-center gap-6">
          <span className="text-muted-foreground">
            Total Customers: <span className="font-semibold text-foreground">{rowData.length}</span>
          </span>

          {/* Edit status */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {auditLog.filter(l => l.status === "success").length} saved
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-500" />
              {auditLog.filter(l => l.status === "error").length} failed
            </span>
            {isSaving && (
              <span className="flex items-center gap-1.5 text-primary">
                <Clock className="h-3 w-3 animate-pulse" />
                Saving...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Entries older than 7 days are locked
          </span>
        </div>
      </div>
    </div>
  )
}

