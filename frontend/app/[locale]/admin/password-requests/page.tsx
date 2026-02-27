"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    Loader2,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Mail,
    Search,
    Filter,
    RefreshCcw,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"
import { getDateFnsLocale } from "@/lib/i18n-utils"
import { format } from "date-fns"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminAuthApi } from "@/lib/api"

interface PasswordRequest {
    id: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    status: string;
    created_at: string;
}

export default function PasswordRequestsPage() {
    const t = useTranslations("Admin.passwordRequests")
    const locale = useLocale()
    const dateFnsLocale = getDateFnsLocale(locale)
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")

    const passwordRequestsKey = ["pending-password-requests"]

    // Fetch requests
    const { data: requests = [], isLoading, refetch } = useQuery({
        queryKey: passwordRequestsKey,
        queryFn: async () => {
            const res = await adminAuthApi.getPasswordRequests()
            return res.data
        },
        refetchInterval: 30000,
    })

    // Approve mutation with Optimistic UI
    const approveMutation = useMutation({
        mutationFn: (id: string) => adminAuthApi.approveRequest(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: passwordRequestsKey })
            const previousRequests = queryClient.getQueryData(passwordRequestsKey)
            queryClient.setQueryData(passwordRequestsKey, (old: PasswordRequest[] | undefined) =>
                old?.map((req: PasswordRequest) => req.id === id ? { ...req, status: 'APPROVED' } : req)
            )
            return { previousRequests }
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(passwordRequestsKey, context?.previousRequests)
            toast.error(t('approveError'))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: passwordRequestsKey })
        },
        onSuccess: () => {
            toast.success(t('approveSuccess'))
        }
    })

    // Reject mutation with Optimistic UI
    const rejectMutation = useMutation({
        mutationFn: (id: string) => adminAuthApi.rejectRequest(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: passwordRequestsKey })
            const previousRequests = queryClient.getQueryData(passwordRequestsKey)
            queryClient.setQueryData(passwordRequestsKey, (old: PasswordRequest[] | undefined) =>
                old?.map((req: PasswordRequest) => req.id === id ? { ...req, status: 'REJECTED' } : req)
            )
            return { previousRequests }
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(passwordRequestsKey, context?.previousRequests)
            toast.error(t('rejectError'))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: passwordRequestsKey })
        },
        onSuccess: () => {
            toast.success(t('rejectSuccess'))
        }
    })

    const filteredRequests = requests
        .filter((r: PasswordRequest) => r.status === "PENDING")
        .filter((r: PasswordRequest) =>
            (r.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.user_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.user_phone || "").includes(searchQuery)
        )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"><Clock size={10} /> {t('statusPending')}</Badge>
            case "APPROVED":
                return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1"><CheckCircle2 size={10} /> {t('statusApproved')}</Badge>
            case "REJECTED":
                return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1"><XCircle size={10} /> {t('statusRejected')}</Badge>
            case "COMPLETED":
                return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1"><CheckCircle2 size={10} /> {t('statusCompleted')}</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title={t('title')}
                highlight={t('titleHighlight')}
                subtitle={t('subtitle')}
                badge="ACCESS_CONTROL_v2.4"
                badgeIcon={<ShieldCheck size={12} />}
                actions={
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        className="h-10 gap-2 border-white/5 bg-white/5 hover:bg-white/10 rounded-xl"
                    >
                        <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
                        {t('refresh')}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-obsidian-800/40 border-white/5 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-white/20 italic font-black">{t('totalRequests')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black italic tracking-tighter font-heading">{requests.length}</p>
                    </CardContent>
                </Card>
                <Card className="bg-obsidian-800/40 border-white/5 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-white/20 italic font-black">{t('pendingApproval')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black italic tracking-tighter font-heading text-amber-500">
                            {requests.filter((r: PasswordRequest) => r.status === "PENDING").length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-obsidian-800/40 border-white/5 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-white/20 italic font-black">{t('successRate')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black italic tracking-tighter font-heading text-emerald-500">
                            {requests.length > 0 ? Math.round((requests.filter((r: PasswordRequest) => r.status === "COMPLETED").length / requests.length) * 100) : 0}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-obsidian-800/40 rounded-2xl border border-white/5 backdrop-blur-3xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                        <Input
                            placeholder={t('filterPlaceholder')}
                            className="pl-10 h-10 bg-white/5 border-white/5 rounded-xl font-bold italic"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-white/20 hover:text-white">
                        <Filter size={16} />
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 p-4">{t('tableUser')}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('tableEmail')}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('tablePhone')}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('tableRequestDate')}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('tableStatus')}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 text-right p-4">{t('tableActions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                                </TableCell>
                            </TableRow>
                        ) : filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center text-white/20 font-black italic uppercase tracking-widest">
                                    {t('noRequests')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((req: PasswordRequest) => (
                                <TableRow key={req.id} className="border-white/5 group hover:bg-white/[0.02] transition-colors">
                                    <TableCell className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-obsidian-700 border border-white/5 flex items-center justify-center text-primary">
                                                <User size={14} />
                                            </div>
                                            <p className="text-xs font-black italic uppercase">{req.user_name}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-[10px] text-white/40 flex items-center gap-1 font-mono uppercase tracking-tighter"><Mail size={8} /> {req.user_email}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-[10px] text-white/40 font-mono uppercase">{req.user_phone || "N/A"}</p>
                                    </TableCell>
                                    <TableCell className="text-[11px] text-white/60 italic font-medium">
                                        {format(new Date(req.created_at), "MMM d, HH:mm", { locale: dateFnsLocale })}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(req.status)}
                                    </TableCell>
                                    <TableCell className="text-right p-4">
                                        {req.status === "PENDING" && (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={rejectMutation.isPending}
                                                    className="h-8 text-[10px] font-black uppercase italic text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                                    onClick={() => rejectMutation.mutate(req.id)}
                                                >
                                                    {t('reject')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={approveMutation.isPending}
                                                    className="h-8 text-[10px] font-black uppercase italic bg-emerald-500 text-black hover:bg-emerald-400"
                                                    onClick={() => approveMutation.mutate(req.id)}
                                                >
                                                    {t('approve')}
                                                </Button>
                                            </div>
                                        )}
                                        {req.status === "APPROVED" && (
                                            <Badge className="bg-emerald-500/5 text-emerald-400/40 border-emerald-500/10">{t('waitingForUser')}</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
