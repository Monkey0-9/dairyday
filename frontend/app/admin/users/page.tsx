"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, ValueFormatterParams, FirstDataRenderedEvent } from "ag-grid-community"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, RefreshCw, Plus, Trash2, Search, Filter, Download } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { usersApi } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue
} from "@/components/ui/select"

interface UserRow {
    id: string
    name: string
    email: string
    phone: string
    role: string
    price_per_liter: number
    is_active: boolean
}

const userSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional(),
    price_per_liter: z.number().min(0, "Price must be positive"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["USER", "ADMIN"])
})

type UserFormValues = z.infer<typeof userSchema>

export default function UsersManagement() {
    const [rowData, setRowData] = useState<UserRow[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [gridApi, setGridApi] = useState<GridApi | null>(null)
    const [searchText, setSearchText] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const { theme } = useTheme()
    const router = useRouter()
    const gridTheme = useMemo(() => theme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz", [theme])
    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: true,
        filter: true,
        resizable: true,
        headerClass: "font-semibold tracking-wide",
        cellClass: "text-sm",
        suppressHeaderKeyboardTraversal: true,
    }), [])

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    const fetchUsers = useCallback(async () => {
        try {
            const res = await usersApi.list()
            setRowData(res.data)
            console.log(`Fetched ${res.data.length} users`)
        } catch (error) {
            console.error("Failed to fetch users", error)
            toast.error("Failed to load customers. Please try again.")
        }
    }, [])

    useEffect(() => {
        if (!token) {
            router.push("/admin/login")
            return
        }
        fetchUsers()
    }, [fetchUsers, token, router])

    const onCellValueChanged = async (event: any) => {
        const { data } = event
        const payload = {
            name: data.name,
            phone: data.phone,
            role: data.role,
            price_per_liter: Number(data.price_per_liter),
            is_active: typeof data.is_active === "string" ? data.is_active === "true" : !!data.is_active
        }
        try {
            await usersApi.update(data.id, payload)
            toast.success("Customer updated")
        } catch (error) {
            console.error("Update failed", error)
            fetchUsers()
            toast.error("Update failed. Reverted.")
        }
    }

    const deleteUser = async (id: string) => {
        if (!confirm("Are you sure? This will deactivate the user.")) return
        try {
            await usersApi.delete(id)
            fetchUsers()
            toast.success("Customer deactivated")
        } catch (error) {
            console.error("Delete failed", error)
            toast.error("Failed to deactivate")
        }
    }

    const columnDefs = useMemo<ColDef<UserRow>[]>(() => [
        {
            field: "name",
            headerName: "Customer",
            editable: true,
            flex: 1.5,
            filter: true,
            sortable: true,
            cellRenderer: (params: ICellRendererParams<UserRow>) => {
                const row = (params.data ?? { name: "", email: "" }) as UserRow
                const name: string = row.name || ""
                const email: string = row.email || ""
                const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                return (
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                            {initials}
                        </div>
                        <div className="leading-tight">
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{email}</div>
                        </div>
                    </div>
                )
            }
        },
        {
            field: "phone",
            headerName: "Phone",
            editable: true,
            width: 140,
            cellRenderer: (p: ICellRendererParams<UserRow>) => (
                <a href={p.value ? `tel:${p.value}` : undefined} className={cn("text-sm", p.value ? "text-primary hover:underline" : "text-muted-foreground")}>
                    {p.value || "—"}
                </a>
            )
        },
        {
            field: "role",
            headerName: "Role",
            editable: true,
            width: 110,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: { values: ["USER", "ADMIN"] }
        },
        {
            field: "price_per_liter",
            headerName: "Price/L (₹)",
            editable: true,
            width: 120,
            valueFormatter: (p: ValueFormatterParams) => p.value ? `₹${Number(p.value).toFixed(2)}` : "₹0.00",
            valueParser: (p: any) => {
                const n = parseFloat(p.newValue)
                return Number.isFinite(n) ? Math.max(0, n) : 0
            }
        },
        {
            field: "is_active",
            headerName: "Active",
            editable: true,
            width: 100,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: { values: ["true", "false"] },
            valueParser: (p: any) => {
                const v = p.newValue
                if (typeof v === "string") return v === "true"
                return !!v
            },
            cellRenderer: (params: ICellRendererParams) => (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", 
                    params.value 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>
                    {params.value ? "Active" : "Inactive"}
                </span>
            )
        },
        {
            headerName: "Actions",
            cellRenderer: (params: ICellRendererParams) => (
                <div className="flex items-center gap-2 h-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUser(params.data.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
            width: 80
        }
    ], [API_URL, token])

    const pinnedBottomRowData = useMemo(() => {
        const total = rowData.length
        const active = rowData.filter(r => r.is_active).length
        const avgPrice = rowData.reduce((acc, r) => acc + Number(r.price_per_liter || 0), 0) / (total || 1)
        return [{
            name: "Summary",
            email: "",
            phone: "",
            role: "",
            price_per_liter: Number.isFinite(avgPrice) ? Number(avgPrice.toFixed(2)) : 0,
            is_active: `${active}/${total} Active`
        }]
    }, [rowData])

    const handleExportCSV = () => {
        if (!gridApi) return
        gridApi.exportDataAsCsv({
            fileName: "customers.csv",
            columnSeparator: ",",
        })
    }

    return (
        <div className="container py-6 md:py-8 h-[calc(100vh-3.5rem)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage user accounts and pricing.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value)
                                gridApi?.setGridOption("quickFilterText", e.target.value)
                            }}
                            placeholder="Search customers..."
                            className="pl-9 w-[220px]"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v: any) => {
                        setStatusFilter(v)
                        if (!gridApi) return
                        const isActiveCol = gridApi.getColumnDef("is_active")
                        if (isActiveCol) {
                            const instance = gridApi.getFilterInstance("is_active")
                            if (instance) {
                                // Use setModel for boolean equals filter
                                const model = v === "all" ? null : { type: "equals", filter: v === "active" }
                                // @ts-ignore - ag-grid filter API
                                instance.setModel(model)
                                gridApi.onFilterChanged()
                            }
                        }
                    }}>
                        <SelectTrigger className="w-[150px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchUsers}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                </div>
            </div>

            <Card className="premium-card overflow-hidden">
                <div className={cn("h-[600px] w-full", gridTheme)}>
                    <AgGridReact
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onCellValueChanged={onCellValueChanged}
                        onGridReady={(params: GridReadyEvent) => setGridApi(params.api)}
                        onFirstDataRendered={(e: FirstDataRenderedEvent) => e.api.sizeColumnsToFit()}
                        pagination={true}
                        paginationPageSize={20}
                        animateRows={true}
                        pinnedBottomRowData={pinnedBottomRowData}
                        quickFilterText={searchText}
                        overlayNoRowsTemplate={`<div class="p-6 text-center text-muted-foreground font-medium">No customers yet. Add a customer to get started.</div>`}
                        overlayLoadingTemplate={`<div class="p-6 flex items-center justify-center"><span class="ag-react-container"><svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"></svg>Loading...</span></div>`}
                    />
                </div>
            </Card>

            {isCreating && (
                <CreateUserDialog open={isCreating} onOpenChange={setIsCreating} onSuccess={fetchUsers} />
            )}
        </div>
    )
}

function CreateUserDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (v: boolean) => void, onSuccess: () => void }) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { role: "USER", price_per_liter: 60 }
    })

    const onSubmit = async (data: UserFormValues) => {
        try {
            console.log("Creating user with data:", { ...data, password: "[REDACTED]" })
            const response = await usersApi.create(data)
            console.log("User created successfully:", response.data)

            toast.success(`Customer "${data.name}" created successfully!`)
            reset()
            onOpenChange(false)
            onSuccess() // This triggers fetchUsers() to refresh the grid
        } catch (error: any) {
            console.error("Failed to create user", error)
            const errorMessage = error.response?.data?.detail || "Failed to create customer. Please try again."
            toast.error(errorMessage)
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
                    <Dialog.Title className="text-lg font-semibold">Add New Customer</Dialog.Title>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" {...register("name")} />
                                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" {...register("email")} />
                                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" {...register("phone")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Price per Litre (₹)</Label>
                                <Input id="price" type="number" step="0.01" {...register("price_per_liter", { valueAsNumber: true })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select defaultValue="USER" onValueChange={(v: string) => {
                                    // reflect selection into react-hook-form
                                    // @ts-ignore
                                    document.getElementById("role-hidden")!.value = v
                                }}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">User</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <input id="role-hidden" type="hidden" {...register("role")} />
                                {errors.role && <p className="text-xs text-destructive">{(errors as any).role?.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" {...register("password")} />
                                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Customer will receive login details privately.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Customer
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
