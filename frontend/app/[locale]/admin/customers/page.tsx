"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Loader2,
  Plus,
  Search,
  Pencil,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Users,
  IndianRupee,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"
import { format, subMonths, addMonths } from "date-fns"
import { enUS, kn, hi, te, ta } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

/* ─── Premium Components ─── */

const Scanline = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.5)_50%)] bg-[length:100%_4px] animate-scanline" />
  </div>
)

const GridBackground = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]" />
  </div>
)

interface GlassStatProps {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  loading?: boolean
}

const GlassStat = ({ title, value, icon, gradient, loading }: GlassStatProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-2.5 rounded-xl bg-obsidian-800/40 border border-white/[0.03] backdrop-blur-3xl shadow-glass-elev flex flex-col justify-between group hover:border-white/10 transition-all duration-700 overflow-hidden relative"
  >
    <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-br", gradient)} />
    <div className="flex justify-between items-start relative z-10">
      <div className={cn("p-1 rounded-lg border border-white/5 bg-white/5 text-white/40 group-hover:text-primary group-hover:border-primary/20 transition-all duration-700")}>
        {React.cloneElement(icon as React.ReactElement, { size: 14 })}
      </div>
      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20 italic">{title}</p>
    </div>
    <div className="mt-2 relative z-10">
      {loading ? (
        <Skeleton className="h-5 w-16 bg-white/5" />
      ) : (
        <p className="text-xl font-black font-heading tracking-tighter italic text-white uppercase leading-none">{value}</p>
      )}
    </div>
  </motion.div>
)

export default function CustomersPage() {
  const t = useTranslations("Admin.customers")
  const locale = useLocale()
  const dateLocale = locale === 'kn' ? kn : locale === 'hi' ? hi : locale === 'te' ? te : locale === 'ta' ? ta : enUS

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name?: string; email?: string; phone?: string; role?: string; is_active?: boolean; price_per_liter?: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const monthStr = format(selectedMonth, "yyyy-MM")

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["customers", monthStr],
    queryFn: async () => {
      const res = await usersApi.list(monthStr)
      return res.data.filter((u: { role?: string }) => u.role === "USER")
    },
    staleTime: 30_000,
  })

  const stats = useMemo(() => {
    const active = customers.filter((c: { is_active?: boolean }) => c.is_active).length
    const totalRevenue = customers.reduce((acc: number, c: { price_per_liter?: number }) => acc + Number(c.price_per_liter || 60), 0)
    const avgRate = customers.length > 0 ? (totalRevenue / customers.length).toFixed(1) : "0.0"
    return { active, avgRate }
  }, [customers])

  const filteredCustomers = customers.filter((c: { name?: string; email?: string; phone?: string }) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1))
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1))

  return (
    <div className="bg-transparent text-white selection:bg-primary/40 space-y-6 pb-12 relative">
      <GridBackground />

      {/* Cinematic Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-white/[0.03] pb-4 relative z-10">
        <div className="space-y-0.5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.05] bg-white/[0.02] backdrop-blur-3xl shadow-[0_0_15px_rgba(59,130,246,0.1)]"
          >
            <ShieldCheck className="h-1.5 w-1.5 text-primary" />
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary italic">USER_REGISTRY_SECURE</span>
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-black font-heading tracking-tight leading-none text-white italic uppercase">
            <span className="opacity-10 block">MEMBER</span>
            <span className="text-gradient -mt-1 block italic lowercase">{t('registry')}</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-obsidian-700/40 border border-white/5 rounded-lg shadow-glass-elev backdrop-blur-3xl">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={handlePrevMonth}>
              <ChevronLeft size={12} />
            </Button>
            <div className="px-2 py-0.5 flex items-center gap-1.5 min-w-[120px] justify-center text-[10px] font-black uppercase tracking-widest text-white italic">
              <CalendarIcon size={10} className="text-primary" />
              {format(selectedMonth, "MMM yyyy", { locale: dateLocale })}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={handleNextMonth}>
              <ChevronRight size={12} />
            </Button>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-8 px-4 rounded-lg bg-white text-black hover:bg-primary hover:text-white font-black font-heading italic tracking-tight gap-1.5 transition-all duration-700 shadow-glow-primary/10 text-xs"
          >
            <Plus size={14} />
            {t('addCustomer').toUpperCase()}
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        <GlassStat
          title={t('totalCustomers')}
          value={customers.length}
          icon={<Users size={18} />}
          gradient="from-blue-600/20 to-indigo-600/0"
          loading={isLoading}
        />
        <GlassStat
          title={t('activeCustomers')}
          value={stats.active}
          icon={<UserCheck size={18} />}
          gradient="from-emerald-600/20 to-teal-600/0"
          loading={isLoading}
        />
        <GlassStat
          title={t('avgRate')}
          value={`₹${stats.avgRate}`}
          icon={<IndianRupee size={18} />}
          gradient="from-amber-600/20 to-orange-600/0"
          loading={isLoading}
        />
      </div>

      {/* Main Registry Section */}
      <section className="space-y-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-obsidian-800/40 p-3 rounded-2xl border border-white/[0.03] backdrop-blur-3xl shadow-glass-elev relative overflow-hidden group">
          <Scanline />
          <div className="relative flex-1 w-full z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-10 h-10 bg-white/[0.02] border-white/5 rounded-xl text-white font-bold placeholder:text-white/10 italic text-[13px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.03] bg-obsidian-800/40 backdrop-blur-3xl shadow-glass-elev overflow-x-auto group/table relative">
          <Scanline />
          <Table className="relative z-10">
            <TableHeader>
              <TableRow className="border-b border-white/5 hover:bg-transparent h-12">
                <TableHead className="px-4 lg:px-6 text-[9px] font-black uppercase tracking-[0.4em] text-white/20 italic">{t('customer')}</TableHead>
                <TableHead className="hidden sm:table-cell text-[9px] font-black uppercase tracking-[0.4em] text-white/20 italic">{t('contact')}</TableHead>
                <TableHead className="hidden md:table-cell text-right text-[9px] font-black uppercase tracking-[0.4em] text-white/20 italic">{t('consumedMonth')}</TableHead>
                <TableHead className="text-right text-[9px] font-black uppercase tracking-[0.4em] text-white/20 italic">{t('rate')}</TableHead>
                <TableHead className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-white/20 italic">{t('status')}</TableHead>
                <TableHead className="px-4 lg:px-6 text-right text-[9px] font-black uppercase tracking-[0.4em] text-white/20 italic">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-white/[0.02] h-24">
                      <TableCell className="px-8"><Skeleton className="h-12 w-48 bg-white/5 rounded-xl" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-40 bg-white/5" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 bg-white/5 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 bg-white/5 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 bg-white/5 mx-auto rounded-full" /></TableCell>
                      <TableCell className="px-8"><Skeleton className="h-10 w-10 bg-white/5 ml-auto rounded-xl" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96 text-center border-none">
                      <div className="flex flex-col items-center justify-center space-y-6 opacity-20 italic uppercase tracking-[0.3em] font-black">
                        <Search size={48} />
                        <p>{searchQuery ? `ZERO_USERS_MATCH:"${searchQuery}"` : "REGISTRY_EMPTY"}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer: { id: string; name?: string; email?: string; phone?: string; total_liters?: number; price_per_liter?: number; is_active?: boolean }, idx: number) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-all duration-500"
                    >
                      <TableCell className="py-2.5 px-4 lg:px-6">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <Avatar className="h-8 w-8 border border-white/5 shadow-glass-elev">
                            <AvatarFallback className="bg-obsidian-700 text-primary font-black italic text-[10px]">
                              {customer.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs lg:text-[13px] font-black italic text-white tracking-tighter uppercase whitespace-nowrap leading-tight">{customer.name}</p>
                            <p className="text-[7px] font-bold text-white/10 tracking-[0.2em] italic uppercase leading-tight">{t('secId')}: {customer.id?.split('-')[0].toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {customer.email && <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/30 italic leading-none"><Mail size={10} /> {customer.email}</div>}
                          {customer.phone && <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/30 italic leading-none"><Phone size={10} /> {customer.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2.5 px-4">
                        <span className="text-base lg:text-lg font-black font-heading italic tracking-tighter text-white/30">
                          {Number(customer.total_liters || 0).toFixed(1)} <span className="text-[7px] opacity-20">L</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5 px-4">
                        <span className="text-base lg:text-lg font-black font-heading italic tracking-tighter text-gradient">
                          ₹{Number(customer.price_per_liter || 60).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2.5 px-4">
                        <Badge className={cn(
                          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] italic gap-1.5 border shadow-glass-elev",
                          customer.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-white/20 border-white/10"
                        )}>
                          {customer.is_active ? <UserCheck size={10} /> : <UserX size={10} />}
                          {customer.is_active ? t('activeNode') : t('deactivated')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 lg:px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 opacity-40 group-hover:opacity-100 transition-all">
                              <Fingerprint className="text-primary" size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-obsidian-900 border-white/5 text-white backdrop-blur-3xl rounded-2xl p-2 shadow-2xl min-w-[200px]">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-white/20 p-3">{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuItem className="rounded-xl p-3 gap-3 focus:bg-white/5 cursor-pointer" onClick={() => { setSelectedCustomer(customer); setIsEditOpen(true); }}>
                              <Pencil size={16} className="text-primary" />
                              <span className="font-bold text-xs uppercase tracking-wider">{t('editDetails')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                              className={cn("rounded-xl p-3 gap-3 focus:bg-white/5 cursor-pointer", customer.is_active ? "text-rose-400" : "text-emerald-400")}
                              onClick={() => {
                                const actionKey = customer.is_active ? 'actionDeactivate' : 'actionReactivate';
                                const statusKey = customer.is_active ? 'statusDeactivated' : 'statusReactivated';
                                if (confirm(t('confirmAction', { action: t(actionKey), name: customer.name || '' }))) {
                                  usersApi.update(customer.id, { is_active: !customer.is_active })
                                    .then(() => {
                                      toast.success(t('actionSuccess', { action: t(statusKey) }));
                                      refetch();
                                    })
                                    .catch(err => toast.error(formatApiError(err)))
                                }
                              }}
                            >
                              {customer.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                              <span className="font-bold text-xs uppercase tracking-wider">{t(customer.is_active ? 'deactivate' : 'reactivate')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem
                              className="rounded-xl p-3 gap-3 focus:bg-rose-500/10 text-rose-500 cursor-pointer"
                              onClick={() => {
                                if (confirm(t('confirmDelete', { name: customer.name || '' }))) {
                                  usersApi.delete(customer.id)
                                    .then(() => { toast.success(t('deleteSuccess')); refetch(); })
                                    .catch(err => toast.error(formatApiError(err)))
                                }
                              }}
                            >
                              <Trash2 size={16} />
                              <span className="font-bold text-xs uppercase tracking-wider">{t('deleteAccount')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Dialogs */}
      <CreateCustomerDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={refetch} />
      {selectedCustomer && (
        <EditCustomerDialog
          customer={selectedCustomer}
          open={isEditOpen}
          onOpenChange={(open: boolean) => { setIsEditOpen(open); if (!open) setSelectedCustomer(null); }}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

/* ─── Dialog Implementation ─── */

function CreateCustomerDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const t = useTranslations("Admin.customers")
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", price_per_liter: "60", daily_target_qty: "1.0", subscription_plan: "standard", password: "", confirmPassword: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) return toast.error(t("passwordMismatch"))
    setIsLoading(true)
    try {
      await usersApi.create({
        ...formData,
        price_per_liter: parseFloat(formData.price_per_liter),
        daily_target_qty: parseFloat(formData.daily_target_qty),
        role: "USER"
      })
      toast.success(t("createSuccess"), { className: "bg-obsidian-900 border-white/5 text-white" })
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) { toast.error(formatApiError(error)) }
    finally { setIsLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-obsidian-900 border-white/5 text-white shadow-2xl backdrop-blur-3xl rounded-2xl p-4 sm:max-w-[440px]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-glow-primary/10">
              <Plus size={18} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black italic font-heading tracking-tight uppercase leading-none">{t('addNewCustomer')}</DialogTitle>
              <DialogDescription className="text-white/40 text-[8px] font-bold uppercase tracking-[0.1em] mt-1">{t('createDescription')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('fullNameLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('emailLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('phoneLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('targetQtyLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-emerald-400 text-[13px]" type="number" step="0.25" required value={formData.daily_target_qty} onChange={e => setFormData({ ...formData, daily_target_qty: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('priceLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-gradient text-[13px]" type="number" required value={formData.price_per_liter} onChange={e => setFormData({ ...formData, price_per_liter: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('planLabel')}</Label>
              <select className="h-9 w-full bg-white/[0.02] border-white/5 rounded-xl text-[11px] font-black italic px-3 appearance-none focus:outline-none" value={formData.subscription_plan} onChange={e => setFormData({ ...formData, subscription_plan: e.target.value })}>
                <option value="standard" className="bg-obsidian-900">{t('standard').toUpperCase()}</option>
                <option value="premium" className="bg-obsidian-900">{t('premium').toUpperCase()}</option>
                <option value="gold" className="bg-obsidian-900">{t('gold').toUpperCase()}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('passwordLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('confirmPasswordLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" type="password" required value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-10 flex-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white hover:bg-white/5 transition-all">{t('cancel').toUpperCase()}</Button>
            <Button disabled={isLoading} className="h-10 flex-1 rounded-xl bg-white text-black hover:bg-primary hover:text-white font-black italic tracking-tight text-base shadow-glow-primary/20 transition-all duration-700">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('provisionNode')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditCustomerDialog({ customer, open, onOpenChange, onSuccess }: { customer: { id: string; name?: string; email?: string; phone?: string; price_per_liter?: number; daily_target_qty?: number; subscription_plan?: string }; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const t = useTranslations("Admin.customers")
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", price_per_liter: "60", daily_target_qty: "1.0", subscription_plan: "standard" })

  useEffect(() => {
    if (customer && open) setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      price_per_liter: customer.price_per_liter?.toString() || "60",
      daily_target_qty: customer.daily_target_qty?.toString() || "1.0",
      subscription_plan: customer.subscription_plan || "standard"
    })
  }, [customer, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await usersApi.update(customer.id, {
        ...formData,
        price_per_liter: parseFloat(formData.price_per_liter),
        daily_target_qty: parseFloat(formData.daily_target_qty)
      })
      toast.success(t("updateSuccess"), { className: "bg-obsidian-900 border-white/5 text-white" })
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) { toast.error(formatApiError(error)) }
    finally { setIsLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-obsidian-900 border-white/5 text-white shadow-2xl backdrop-blur-3xl rounded-2xl p-4 sm:max-w-[440px]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-glow-amber/10">
              <Pencil size={18} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black italic font-heading tracking-tight uppercase leading-none">{t('editCustomer')}</DialogTitle>
              <DialogDescription className="text-white/40 text-[8px] font-bold uppercase tracking-[0.1em] mt-1">{t('updateDescription', { name: customer.name || 'User' })}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('fullNameLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('emailLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('phoneLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-[13px]" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('targetQtyLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-emerald-400 text-[13px]" type="number" step="0.25" required value={formData.daily_target_qty} onChange={e => setFormData({ ...formData, daily_target_qty: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('priceLabel')}</Label>
              <Input className="h-9 bg-white/[0.02] border-white/5 rounded-xl font-bold italic text-gradient text-[13px]" type="number" required value={formData.price_per_liter} onChange={e => setFormData({ ...formData, price_per_liter: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{t('planLabel')}</Label>
              <select className="h-9 w-full bg-white/[0.02] border-white/5 rounded-xl text-[11px] font-black italic px-3 appearance-none focus:outline-none" value={formData.subscription_plan} onChange={e => setFormData({ ...formData, subscription_plan: e.target.value })}>
                <option value="standard" className="bg-obsidian-900">{t('standard').toUpperCase()}</option>
                <option value="premium" className="bg-obsidian-900">{t('premium').toUpperCase()}</option>
                <option value="gold" className="bg-obsidian-900">{t('gold').toUpperCase()}</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-10 flex-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white hover:bg-white/5 transition-all">{t('cancel').toUpperCase()}</Button>
            <Button disabled={isLoading} className="h-10 flex-1 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-black italic tracking-tight text-base shadow-glow-amber/20 transition-all duration-700">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('updateNode')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
