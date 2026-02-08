"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams, ICellRendererParams } from "ag-grid-community"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, Download, Calendar, FileText, Clock, Share2, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { EmptyState, LoadingState } from "@/components/ui/empty-state"

interface BillRow {
    id: string
    user_id: string
    user_name: string
    total_liters: number
    total_amount: number
    status: string
    pdf_url?: string | null
    isGenerating?: boolean
}

export default function BillsManagement() {
    const [rowData, setRowData] = useState<BillRow[]>([])
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
    const [gridApi, setGridApi] = useState<GridApi | null>(null)
    const [generatingBills, setGeneratingBills] = useState<Set<string>>(new Set())
    const [isGeneratingAll, setIsGeneratingAll] = useState(false)
    const { theme } = useTheme()
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    const gridTheme = useMemo(() => theme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz", [theme])
    
    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: true,
        filter: true,
        resizable: true,
        headerClass: "font-semibold tracking-wide",
        cellClass: "text-sm font-tabular-nums",
        suppressHeaderKeyboardTraversal: true,
    }), [])

    const fetchUsers = useCallback(async () => {
        if (!token) return {}
        try {
            const res = await axios.get(`${API_URL}/users/`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const usersMap: Record<string, string> = {}
            res.data.forEach((u: any) => usersMap[u.id] = u.name)
            return usersMap
        } catch {
            return {}
        }
    }, [API_URL, token])

    const { data: usersMap } = useQuery({
        queryKey: ["usersMap"],
        queryFn: fetchUsers,
        staleTime: 1000 * 60 * 5
    })

    const fetchBills = useCallback(async () => {
        if (!token) return
        try {
            const res = await axios.get(`${API_URL}/bills/?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            
            const enrichedData = res.data.map((b: any) => ({
                ...b,
                user_name: usersMap?.[b.user_id] || b.user_id,
                isGenerating: !b.pdf_url
            }))

            setRowData(enrichedData)
        } catch (error) {
            console.error("Failed to fetch bills", error)
        }
    }, [month, API_URL, token, usersMap])

    useEffect(() => {
        fetchBills()
    }, [fetchBills])

    const generateBill = useCallback(async (userId: string) => {
        if (!token || !userId) return
        
        setGeneratingBills(prev => new Set(prev).add(userId))
        try {
            const response = await axios.post(
                `${API_URL}/bills/generate/${userId}/${month}`, 
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )
            
            if (response.status === 202) {
                // Poll for PDF URL completion
                setTimeout(() => {
                    setGeneratingBills(prev => {
                        const next = new Set(prev)
                        next.delete(userId)
                        return next
                    })
                    fetchBills()
                }, 5000)  // Check after 5 seconds
            }
        } catch (error) {
            console.error("Failed to generate bill", error)
        } finally {
            setGeneratingBills(prev => {
                const next = new Set(prev)
                next.delete(userId)
                return next
            })
        }
    }, [API_URL, token, month, fetchBills])

    const generateAllBills = useCallback(async () => {
        if (!token || !confirm(`Generate bills for ALL active customers for ${month}?`)) return
        
        setIsGeneratingAll(true)
        try {
            const response = await axios.post(
                `${API_URL}/bills/generate-all?month=${month}`, 
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )
            
            if (response.status === 202) {
                // Refresh after delay
                setTimeout(() => {
                    fetchBills()
                }, 5000)
            }
        } catch (error) {
            console.error("Error generating bills", error)
        } finally {
            setIsGeneratingAll(false)
        }
    }, [API_URL, token, month, fetchBills])

    const columnDefs = useMemo<ColDef<BillRow>[]>(() => [
        { 
            field: "user_name", 
            headerName: "Customer", 
            flex: 1, 
            filter: true, 
            sortable: true,
            cellClass: "font-medium"
        },
        { 
            field: "total_liters", 
            headerName: "Liters", 
            width: 100,
            valueFormatter: (p: ValueFormatterParams) => {
                const val = p.value
                return typeof val === "number" ? val.toFixed(2) : "0.00"
            }
        },
        { 
            field: "total_amount", 
            headerName: "Amount (₹)", 
            width: 130,
            cellStyle: { fontWeight: 600 },
            valueFormatter: (p: ValueFormatterParams) => {
                const val = p.value
                return typeof val === "number" ? `₹${val.toFixed(2)}` : "₹0.00"
            }
        },
        { 
            field: "status", 
            headerName: "Status", 
            width: 110,
            cellStyle: (params) => {
                const status = params.value
                const isPaid = status === "PAID"
                return { 
                    color: isPaid ? "var(--color-success)" : "var(--color-warning)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "11px"
                }
            },
            valueFormatter: (p: ValueFormatterParams) => p.value || "PENDING"
        },
        { 
            headerName: "Invoice",
            width: 140,
            cellRenderer: (params: ICellRendererParams<BillRow>) => {
                const bill = params.data
                if (!bill) return null
                
                // Check if PDF is being generated
                const isGenerating = generatingBills.has(bill.user_id) || bill.isGenerating
                
                if (isGenerating) {
                    return (
                        <div className="flex items-center gap-1.5 text-amber-500 text-xs">
                            <Clock className="h-3 w-3 animate-pulse" />
                            <span>Generating...</span>
                        </div>
                    )
                }
                
                // Check for valid PDF URL
                if (bill.pdf_url) {
                    return (
                        <a 
                            href={bill.pdf_url}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                        >
                            <Download className="h-3 w-3" />
                            Download
                        </a>
                    )
                }
                
                return (
                    <span className="text-muted-foreground text-xs">Not ready</span>
                )
            }
        },
        {
            headerName: "Actions",
            width: 170,
            cellRenderer: (params: ICellRendererParams<BillRow>) => {
                const bill = params.data
                if (!bill) return null
                
                const isGenerating = generatingBills.has(bill.user_id) || bill.isGenerating
                
                const handleShare = () => {
                    const text = `Hello ${bill.user_name}, your milk bill for ${month} is generated.\nTotal: ₹${bill.total_amount}\nLink: ${bill.pdf_url || "Please contact admin"}`
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
                }

                return (
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => generateBill(bill.user_id)}
                            disabled={isGenerating || isGeneratingAll}
                            className="h-7 px-2 text-xs"
                            title="Regenerate Bill"
                        >
                            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            disabled={!bill.pdf_url}
                            className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )
            }
        }
    ], [generateBill, generatingBills, isGeneratingAll])

    const pinnedBottomRowData = useMemo(() => {
        const totalLiters = rowData.reduce((acc, r) => acc + Number(r.total_liters || 0), 0)
        const totalAmount = rowData.reduce((acc, r) => acc + Number(r.total_amount || 0), 0)
        return [{ 
            user_name: "Totals", 
            total_liters: Number(totalLiters.toFixed(2)), 
            total_amount: Number(totalAmount.toFixed(2)), 
            status: "", 
            pdf_url: "" 
        }]
    }, [rowData])

    // Loading state
    if (!token) {
        return (
            <div className="container py-6 md:py-8 h-[calc(100vh-3.5rem)] flex items-center justify-center">
                <LoadingState message="Checking authentication..." />
            </div>
        )
    }

    return (
        <div className="container py-6 md:py-8 h-[calc(100vh-3.5rem)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Monthly Bills</h1>
                    <p className="text-sm text-muted-foreground mt-1">Generate and manage customer invoices.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-md border">
                        <Calendar className="ml-2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="month" 
                            value={month} 
                            onChange={(e) => setMonth(e.target.value)} 
                            className="border-0 focus-visible:ring-0 w-auto bg-transparent h-8 text-sm font-medium"
                        />
                    </div>

                    <Button 
                        onClick={generateAllBills} 
                        disabled={isGeneratingAll} 
                        size="sm"
                    >
                        {isGeneratingAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        Generate All
                    </Button>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <div className={cn("h-full w-full rounded-md overflow-hidden shadow-sm", gridTheme)}>
                    <AgGridReact
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onGridReady={(params: GridReadyEvent) => {
                            setGridApi(params.api)
                            params.api.sizeColumnsToFit()
                        }}
                        pagination={true}
                        paginationPageSize={20}
                        pinnedBottomRowData={pinnedBottomRowData}
                        overlayNoRowsTemplate={`<div class="flex items-center justify-center h-full w-full">${document.getElementById('bills-empty-template')?.innerHTML || ''}</div>`}
                        overlayLoadingTemplate={`<div class="flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Loading bills...</span></div>`}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-4">
                    <span>Total Bills: {rowData.length}</span>
                    <span className="text-success">
                        {rowData.filter(b => b.status === "PAID").length} Paid
                    </span>
                    <span className="text-warning">
                        {rowData.filter(b => b.status !== "PAID").length} Unpaid
                    </span>
                </div>
                <div>
                    PDF generation runs asynchronously
                </div>
            </div>
        </div>
    )
}

