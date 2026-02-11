"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    Loader2,
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    Mail,
    Phone,
    UserCheck,
    UserX,
    Users,
    IndianRupee,
    Sparkles,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { format, subMonths, addMonths } from "date-fns"

import { useTranslation } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { usersApi } from "@/lib/api"
import { cn, formatApiError } from "@/lib/utils"

export default function CustomersPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const { t } = useTranslation()
    
    // Month Selection
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const monthStr = format(selectedMonth, "yyyy-MM")

    const queryClient = useQueryClient()

    const { data: customers = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["customers", monthStr],
        queryFn: async () => {
            const res = await usersApi.list(monthStr)
            return res.data.filter((u: any) => u.role === "USER");
        },
        staleTime: 30_000,
    })

    const filteredCustomers = customers.filter((c: any) =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery)
    )

    const activeCount = customers.filter((c: any) => c.is_active).length
    const totalRevenue = customers.reduce((acc: number, c: any) => acc + Number(c.price_per_liter || 60), 0)

    const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1))
    const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">{t('customers')}</h1>
                    <p className="text-muted-foreground">{t('manageCustomers')}</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Month Selector */}
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

                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-lg shadow-primary/25"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('addCustomer')}
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            {/* ... (keep stats row) ... */}

            {/* Customer Table */}
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <CardTitle>{t('allCustomers')}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading || isRefetching}>
                                <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
                            </Button>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('searchCustomers')}
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800">
                                    <TableHead className="w-12 font-bold">#</TableHead>
                                    <TableHead className="font-bold">Customer</TableHead>
                                    <TableHead className="font-bold">Contact</TableHead>
                                    <TableHead className="font-bold text-right">Consumed (Month)</TableHead>
                                    <TableHead className="font-bold text-right">{t('rate')} (₹/L)</TableHead>
                                    <TableHead className="font-bold">{t('status')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('action')}</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                            <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            {searchQuery ? "No customers found matching your search." : "No customers yet. Click 'Add Customer' to get started."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map((customer: any, index: number) => (
                                        <TableRow key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-medium text-muted-foreground">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary font-bold">
                                                            {customer.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold">{customer.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            ID: {customer.id?.split('-')[0].toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {customer.email && (
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Mail className="h-3 w-3" />
                                                            {customer.email}
                                                        </div>
                                                    )}
                                                    {customer.phone && (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                                            {customer.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                                {Number(customer.total_liters || 0).toFixed(1)} L
                                            </TableCell>
                                            <TableCell className="text-right font-bold tabular-nums">
                                                ₹{Number(customer.price_per_liter || 60).toLocaleString()}
                                            </TableCell>

                                            <TableCell>
                                                <Badge className={cn(
                                                    "gap-1",
                                                    customer.is_active
                                                        ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200"
                                                )}>
                                                    {customer.is_active ? (
                                                        <UserCheck className="h-3 w-3" />
                                                    ) : (
                                                        <UserX className="h-3 w-3" />
                                                    )}
                                                    {customer.is_active ? t('active') : t('inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t('action')}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedCustomer(customer)
                                                            setIsEditOpen(true)
                                                        }}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className={customer.is_active ? "text-red-600" : "text-green-600"}
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to ${customer.is_active ? 'deactivate' : 'reactivate'} ${customer.name}?`)) {
                                                                    usersApi.update(customer.id, { is_active: !customer.is_active })
                                                                        .then(() => {
                                                                            toast.success(`Customer ${customer.is_active ? 'deactivated' : 'reactivated'}`)
                                                                            refetch()
                                                                        })
                                                                        .catch(err => toast.error(formatApiError(err)))
                                                                }
                                                            }}
                                                        >
                                                            {customer.is_active ? (
                                                                <>
                                                                    <UserX className="mr-2 h-4 w-4" />
                                                                    {t('deactivate')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                                    {t('reactivate')}
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/10"
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to PERMANENTLY DELETE ${customer.name}? This action cannot be undone and will remove all associated data.`)) {
                                                                    usersApi.delete(customer.id)
                                                                        .then(() => {
                                                                            toast.success("Customer deleted permanently")
                                                                            refetch()
                                                                        })
                                                                        .catch(err => toast.error(formatApiError(err)))
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('deletePermanently')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create Customer Dialog */}
            <CreateCustomerDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={refetch} />

            {/* Edit Customer Dialog */}
            {selectedCustomer && (
                <EditCustomerDialog
                    customer={selectedCustomer}
                    open={isEditOpen}
                    onOpenChange={(open) => {
                        setIsEditOpen(open)
                        if (!open) setSelectedCustomer(null)
                    }}
                    onSuccess={refetch}
                />
            )}
        </div>
    )
}

function StatCard({ title, value, icon, gradient, loading }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    gradient: string;
    loading: boolean;
}) {
    return (
        <Card className="relative overflow-hidden border-none shadow-lg">
            <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", gradient)} />
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", gradient)}>
                        {icon}
                    </div>
                </div>
                {loading ? (
                    <Skeleton className="h-8 w-24" />
                ) : (
                    <p className="text-2xl font-black">{value}</p>
                )}
            </CardContent>
        </Card>
    )
}

function CreateCustomerDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useTranslation()
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        price_per_liter: "60",
        password: "",
        confirmPassword: ""
    })

    const resetForm = () => {
        setFormData({ name: "", email: "", phone: "", price_per_liter: "60", password: "", confirmPassword: "" })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match")
            return
        }
        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }

        setIsLoading(true)
        try {
            await usersApi.create({
                email: formData.email,
                password: formData.password,
                name: formData.name,
                phone: formData.phone,
                price_per_liter: parseFloat(formData.price_per_liter),
                role: "USER"
            })
            toast.success("Customer created successfully!")
            onOpenChange(false)
            resetForm()
            onSuccess()
        } catch (error: any) {
            toast.error(formatApiError(error));
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen)
            if (!isOpen) resetForm()
        }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        {t('createCustomerHeader')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('createCustomerSub')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Ramesh Kumar"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ramesh@example.com"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                placeholder="+91 9876543210"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rate">{t('rate')} (₹) *</Label>
                        <Input
                            id="rate"
                            type="number"
                            min="0"
                            step="0.5"
                            required
                            value={formData.price_per_liter}
                            onChange={e => setFormData({ ...formData, price_per_liter: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Min 6 characters"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirm Password *</Label>
                            <Input
                                id="confirm"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-primary to-blue-600"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditCustomerDialog({ customer, open, onOpenChange, onSuccess }: { customer: any, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useTranslation()
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        price_per_liter: "60",
    })

    // Properly initialize form when customer changes
    useEffect(() => {
        if (customer && open) {
            setFormData({
                name: customer.name || "",
                email: customer.email || "",
                phone: customer.phone || "",
                price_per_liter: customer.price_per_liter?.toString() || "60",
            })
        }
    }, [customer, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await usersApi.update(customer.id, {
                email: formData.email,
                name: formData.name,
                phone: formData.phone,
                price_per_liter: parseFloat(formData.price_per_liter),
            })
            toast.success("Customer updated successfully!")
            onOpenChange(false)
            onSuccess()
        } catch (error: any) {
            toast.error(formatApiError(error))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                            <Pencil className="h-4 w-4" />
                        </div>
                        Edit Customer
                    </DialogTitle>
                    <DialogDescription>
                        Update details for {customer?.name}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Full Name *</Label>
                        <Input
                            id="edit-name"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email *</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                                id="edit-phone"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-rate">Price per Liter (₹) *</Label>
                        <Input
                            id="edit-rate"
                            type="number"
                            min="0"
                            step="0.5"
                            required
                            value={formData.price_per_liter}
                            onChange={e => setFormData({ ...formData, price_per_liter: e.target.value })}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-amber-500 to-orange-500"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
