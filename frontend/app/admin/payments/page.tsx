"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    Loader2,
    Search,
    Filter,
    Download,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    CreditCard,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function AdminPaymentsPage() {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")
    const queryClient = useQueryClient()

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

    const { data: bills, isLoading, isFetching } = useQuery({
        queryKey: ["admin-bills", month],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/bills/?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data
        },
        enabled: !!token
    })

    const generateBillsMutation = useMutation({
        mutationFn: async () => {
            return axios.post(`${API_URL}/bills/generate-all?month=${month}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
        }
    })

    const filteredBills = bills?.filter((bill: any) => {
        const matchesStatus = statusFilter === "all" || bill.status === statusFilter
        // Note: In real app, bill might include user name, if not we'd join on frontend or backend
        // For now searching on user_id or status
        const matchesSearch = bill.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.status.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesStatus && matchesSearch
    })

    const stats = {
        total: bills?.length || 0,
        paid: bills?.filter((b: any) => b.status === "PAID").length || 0,
        unpaid: bills?.filter((b: any) => b.status === "UNPAID").length || 0,
        totalAmount: bills?.reduce((acc: number, b: any) => acc + Number(b.total_amount), 0) || 0,
        receivedAmount: bills?.filter((b: any) => b.status === "PAID").reduce((acc: number, b: any) => acc + Number(b.total_amount), 0) || 0
    }

    return (
        <div className="container py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments Dashboard</h1>
                    <p className="text-muted-foreground">Monitor billing cycles and collection status.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-[180px]"
                    />
                    <Button
                        onClick={() => generateBillsMutation.mutate()}
                        disabled={generateBillsMutation.isPending}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {generateBillsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generate Bills
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">For {month}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Collected</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{stats.receivedAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{((stats.receivedAmount / (stats.totalAmount || 1)) * 100).toFixed(1)}% collection rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bills Sent</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">{stats.paid} Paid, {stats.unpaid} Pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">₹{(stats.totalAmount - stats.receivedAmount).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Awaiting payment from {stats.unpaid} users</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle>Bill Records</CardTitle>
                            <CardDescription>Detailed list of invoices for {month}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search user ID..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[130px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Liters</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Invoice</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBills?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                No bills found for the selected criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBills?.map((bill: any) => (
                                            <TableRow key={bill.id}>
                                                <TableCell className="font-mono text-xs">{bill.user_id}</TableCell>
                                                <TableCell>{bill.total_liters} L</TableCell>
                                                <TableCell>₹{Number(bill.total_amount).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={bill.status === "PAID" ? "default" : "secondary"} className={cn(
                                                        bill.status === "PAID" 
                                                            ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" 
                                                            : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                                                    )}>
                                                        {bill.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!bill.pdf_url}
                                                        onClick={() => window.open(bill.pdf_url, "_blank")}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
