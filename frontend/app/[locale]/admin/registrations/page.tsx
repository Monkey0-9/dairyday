"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
    UserPlus,
    Search,
    XCircle,
    Clock,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ShieldCheck,
    Loader2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { registrationApi } from "@/lib/api"
import { formatApiError } from "@/lib/utils"

export default function RegistrationsPage() {
    const t = useTranslations("Admin.registrations")
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState("")

    const { data: requests, isLoading, refetch } = useQuery({
        queryKey: ["pending-registration-requests"],
        queryFn: async () => {
            const response = await registrationApi.getRequests()
            return response.data
        },
        refetchInterval: 30000,
    })

    const approveMutation = useMutation({
        mutationFn: (id: string) => registrationApi.approve(id),
        onSuccess: () => {
            toast.success(t("approved") || "Identity Verified & Authorized")
            queryClient.invalidateQueries({ queryKey: ["registration-requests"] })
            queryClient.invalidateQueries({ queryKey: ["customers"] })
        },
        onError: (error) => toast.error(formatApiError(error)),
    })

    const rejectMutation = useMutation({
        mutationFn: (id: string) => registrationApi.reject(id),
        onSuccess: () => {
            toast.success(t("rejected") || "Request Terminated")
            queryClient.invalidateQueries({ queryKey: ["registration-requests"] })
        },
        onError: (error) => toast.error(formatApiError(error)),
    })

    const filteredRequests = requests?.filter((req: { name: string; email: string }) =>
        req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="font-micro text-[10px] tracking-[0.4em] text-white/40 uppercase italic">{t('joinProtocolActive')}</span>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-white font-heading italic uppercase leading-none">
                        {t('registrations')}
                    </h1>
                    <p className="text-white/40 text-sm font-medium italic max-w-2xl mt-1">
                        {t('description')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t('filterByIdentity')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full lg:w-[240px] h-10 pl-10 bg-white/[0.02] border-white/5 focus:border-primary/20 rounded-xl transition-all italic font-heading font-black text-xs uppercase"
                        />
                    </div>
                    <Button
                        onClick={() => refetch()}
                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all shadow-glow-primary/5"
                    >
                        <Clock className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Grid View */}
            <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-3xl overflow-hidden glass-card">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="font-micro text-[8px] tracking-[0.2em] uppercase h-10 text-white/40 pl-6">{t('subjectIdentity')}</TableHead>
                                <TableHead className="font-micro text-[8px] tracking-[0.2em] uppercase h-10 text-white/40">{t('contactSync')}</TableHead>
                                <TableHead className="font-micro text-[8px] tracking-[0.2em] uppercase h-10 text-white/40">{t('temporalMarker')}</TableHead>
                                <TableHead className="font-micro text-[8px] tracking-[0.2em] uppercase h-10 text-white/40">{t('clearanceLevel')}</TableHead>
                                <TableHead className="font-micro text-[8px] tracking-[0.2em] uppercase h-10 text-white/40 text-right pr-6">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i} className="border-white/5">
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                    <span className="font-micro text-[10px] tracking-widest text-white/20">{t('fetchingData')}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredRequests?.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-[400px] text-center">
                                            <div className="flex flex-col items-center justify-center gap-6 opacity-20">
                                                <ShieldCheck size={80} strokeWidth={0.5} />
                                                <div className="space-y-2">
                                                    <p className="font-heading font-black italic text-2xl uppercase tracking-tighter">{t('networkClean')}</p>
                                                    <p className="font-micro text-[10px] tracking-widest uppercase">{t('noRequests')}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRequests?.map((req: { id: string; name: string; email: string; phone: string; address: string; created_at: string }) => (
                                    <motion.tr
                                        key={req.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group border-white/[0.03] hover:bg-white/[0.01] transition-all duration-500"
                                    >
                                        <TableCell className="py-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                                                    <UserPlus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="font-heading font-black italic text-lg tracking-tight uppercase text-white group-hover:text-primary transition-colors">
                                                        {req.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-white/20">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={8} className="text-primary/40" />
                                                            <span className="text-[9px] font-bold tracking-tight truncate max-w-[120px]">{req.address || t('sectorUnknown')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-white/40 group-hover:text-white/60 transition-colors">
                                                    <Mail size={10} className="text-primary/40" />
                                                    <span className="text-[11px] font-bold tracking-tight">{req.email || "N/A"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/40 group-hover:text-white/60 transition-colors">
                                                    <Phone size={10} className="text-primary/40" />
                                                    <span className="text-[11px] font-bold tracking-tight">{req.phone || "N/A"}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={10} className="text-primary/40" />
                                                <span className="text-[10px] font-black italic text-white/20 uppercase tracking-tighter">
                                                    {format(new Date(req.created_at), "dd_MMM_yyyy")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 font-micro text-[8px] tracking-widest uppercase rounded shadow-glow-amber/5">
                                                {t('pendingGate')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-3 group-hover:translate-x-0 duration-500">
                                                <Button
                                                    onClick={() => approveMutation.mutate(req.id)}
                                                    disabled={approveMutation.isPending}
                                                    className="h-8 px-4 rounded-lg bg-primary text-white hover:bg-primary/80 font-heading font-black italic text-[10px] tracking-tight uppercase flex gap-2"
                                                >
                                                    {approveMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : <ShieldCheck size={12} />}
                                                    {t('authorize')}
                                                </Button>
                                                <Button
                                                    onClick={() => rejectMutation.mutate(req.id)}
                                                    disabled={rejectMutation.isPending}
                                                    className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 text-white/20 transition-all flex items-center justify-center p-0"
                                                >
                                                    {rejectMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : <XCircle size={14} />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Security Analytics Footer */}
            <div className="grid grid-cols-3 gap-4 pb-6 mt-4">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-xl space-y-2">
                    <span className="font-micro text-[8px] tracking-[0.2em] text-white/20 uppercase leading-none block">{t('networkIntegrity')}</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black italic text-white font-heading">100%</span>
                        <span className="text-emerald-500 font-micro text-[7px] uppercase italic tracking-widest">{t('activeShield')}</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-xl space-y-2">
                    <span className="font-micro text-[8px] tracking-[0.2em] text-white/20 uppercase leading-none block">{t('requestVelocity')}</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black italic text-white font-heading">NORMAL</span>
                        <span className="text-primary/60 font-micro text-[7px] uppercase italic tracking-widest">{t('protocolSteady')}</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-xl space-y-2">
                    <span className="font-micro text-[8px] tracking-[0.2em] text-white/20 uppercase leading-none block">{t('pendingClearance')}</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black italic text-white font-heading">{requests?.length || 0}</span>
                        <span className="text-amber-500 font-micro text-[7px] uppercase italic tracking-widest">{t('awaitingAction')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
