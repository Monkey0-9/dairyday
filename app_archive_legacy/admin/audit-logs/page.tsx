"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, GridReadyEvent, FirstDataRenderedEvent } from "ag-grid-community"
import axios from "axios"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { useTheme } from "next-themes"
import { cn, formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

interface AuditLogRow {
    id: string
    action: string
    target_type: string
    user_id: string
    timestamp: string
    details: any
    ip_address: string
}

export default function AuditLogsPage() {
    const { theme } = useTheme()
    const [rowData, setRowData] = useState<AuditLogRow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [quickFilterText, setQuickFilterText] = useState("")

    const gridTheme = useMemo(() => {
        return theme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"
    }, [theme])

    const columnDefs: ColDef[] = [
        {
            field: "timestamp",
            headerName: "Time",
            width: 180,
            valueFormatter: (params) => formatDateTime(params.value),
            sort: 'desc'
        },
        {
            field: "action",
            headerName: "Action",
            cellClass: "font-bold",
            filter: true
        },
        { field: "target_type", headerName: "Area", width: 120 },
        { field: "ip_address", headerName: "IP Source", width: 140 },
        {
            field: "details",
            headerName: "Detail Change",
            flex: 1,
            cellRenderer: (params: any) => {
                return <pre className="text-xs opacity-70 p-1 bg-muted rounded truncate">
                    {JSON.stringify(params.value)}
                </pre>
            }
        }
    ]

    const fetchLogs = useCallback(async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            const res = await axios.get("http://localhost:8000/api/v1/admin/audit-logs", {
                headers: { Authorization: `Bearer ${token}` }
            })
            setRowData(res.data)
        } catch (error) {
            console.error("Failed to fetch logs", error)
            toast.error("Security vault access failed")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    return (
        <div className="container py-6 md:py-10 space-y-8 animate-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-gradient">Audit Vault</h1>
                    </div>
                    <p className="text-muted-foreground">Immutable record of every technical action across the platform.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Search logs..."
                            className="pl-9 pr-4 py-2 bg-secondary/50 rounded-lg border focus:ring-2 ring-primary/20 outline-none w-64"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card className="premium-card overflow-hidden">
                <div className={cn("h-[600px] w-full", gridTheme)}>
                    <AgGridReact
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={20}
                        animateRows={true}
                        quickFilterText={quickFilterText}
                        overlayLoadingTemplate={'<div class="flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span>Loading Audit Trail...</span></div>'}
                    />
                </div>
            </Card>
        </div>
    )
}
