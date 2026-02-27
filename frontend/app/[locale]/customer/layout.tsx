"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  Milk,
  Bell,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight
} from "lucide-react"

import LanguageSwitcher from "@/components/language-switcher"
import { MobileNav } from "@/components/mobile-nav"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { billsApi, consumptionApi, authApi, adminAuthApi, registrationApi } from "@/lib/api"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Zap, Fingerprint } from "lucide-react"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard")
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const currentMonth = format(new Date(), "yyyy-MM")

  useEffect(() => {
    setUserId(authApi.getUserId())
    setUserRole(authApi.getUserRole())
  }, [])

  const isAdmin = userRole === 'ADMIN' || userRole === 'BILLING_ADMIN'

  // 1. Fetch Unpaid Bills (Personal)
  const { data: bills = [] } = useQuery({
    queryKey: ["my-bills-notifications", userId],
    queryFn: async () => {
      const res = await billsApi.list()
      const billsArray = (res.data?.bills as { id: string; status: string; month: string }[]) || []
      return billsArray.filter(b => b.status === "UNPAID")
    },
    enabled: !!userId && !isAdmin,
    staleTime: 60_000,
    refetchInterval: 60000,
  })

  // 2. Fetch Processed/Pending Requests (Personal)
  const { data: consumption = [] } = useQuery({
    queryKey: ["my-consumption-notifications", userId, currentMonth],
    queryFn: async () => {
      const res = await consumptionApi.getMine(currentMonth)
      const consArray = (res.data as { id: string; date: string; request_status?: string }[]) || []
      return consArray.filter(c => c.request_status && c.request_status !== "COMPLETED")
    },
    enabled: !!userId && !isAdmin,
    staleTime: 60_000,
    refetchInterval: 60000,
  })

  // 3. Admin-Specific Data (if admin)
  const { data: adminPasswordRequests = [] } = useQuery({
    queryKey: ["admin-pending-passwords"],
    queryFn: async () => {
      const res = await adminAuthApi.getPasswordRequests()
      return res.data.filter((r: { status: string }) => r.status === 'PENDING')
    },
    enabled: isAdmin,
    staleTime: 60_000,
    refetchInterval: 60000
  })

  const { data: adminConsumptionRequests = [] } = useQuery({
    queryKey: ["admin-pending-consumption"],
    queryFn: async () => {
      const res = await consumptionApi.getRequests()
      return res.data
    },
    enabled: isAdmin,
    staleTime: 60_000,
    refetchInterval: 60000
  })

  const { data: adminRegistrationRequests = [] } = useQuery({
    queryKey: ["admin-pending-registrations"],
    queryFn: async () => {
      const res = await registrationApi.getRequests()
      return res.data
    },
    enabled: isAdmin,
    staleTime: 60_000,
    refetchInterval: 60000
  })

  const notifications = isAdmin
    ? [
      ...adminPasswordRequests.map((r: { id: string }) => ({
        id: `pwd-${r.id}`,
        type: 'SECURITY',
        title: "Password Reset Pending",
        icon: Zap,
        href: "/admin/password-requests",
        color: "text-amber-500",
        bg: "bg-amber-500/10"
      })),
      ...adminConsumptionRequests.map((r: { id: string }) => ({
        id: `appr-${r.id}`,
        type: 'APPROVAL',
        title: "Consumption Request Pending",
        icon: Receipt,
        href: "/admin/approvals",
        color: "text-primary",
        bg: "bg-primary/10"
      })),
      ...adminRegistrationRequests.map((r: { id: string }) => ({
        id: `reg-${r.id}`,
        type: 'REGISTRATION',
        title: "New Join Request",
        icon: Fingerprint,
        href: "/admin/registrations",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10"
      }))
    ]
    : [
      ...bills.map((b: { id: string; month: string }) => ({
        id: `bill-${b.id}`,
        type: 'BILL',
        title: t('billAlert', { month: b.month }),
        icon: Receipt,
        href: "/customer/dashboard",
        color: "text-amber-500",
        bg: "bg-amber-500/10"
      })),
      ...consumption.map((c: { id: string; date: string; request_status?: string }) => ({
        id: `request-${c.id}`,
        type: 'REQUEST',
        title: c.request_status === 'APPROVED'
          ? t('requestApproved', { date: c.date })
          : c.request_status === 'REJECTED'
            ? t('requestRejected', { date: c.date })
            : t('requestPending', { date: c.date }),
        icon: c.request_status === 'APPROVED' ? CheckCircle2 : c.request_status === 'REJECTED' ? XCircle : Clock,
        href: "/customer/calendar",
        color: c.request_status === 'APPROVED' ? "text-emerald-500" : c.request_status === 'REJECTED' ? "text-rose-500" : "text-primary",
        bg: c.request_status === 'APPROVED' ? "bg-emerald-500/10" : c.request_status === 'REJECTED' ? "bg-rose-500/10" : "bg-primary/10"
      }))
    ]

  const totalCount = notifications.length

  // Toast logic for new notifications
  const [prevCount, setPrevCount] = useState(0)
  useEffect(() => {
    if (totalCount > prevCount) {
      toast.info(t('notifications'), {
        description: `SYSLOG: You have ${totalCount} updates requiring attention.`,
      })
    }
    setPrevCount(totalCount)
  }, [totalCount, prevCount, t])

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30 text-foreground">
      {/* Glassmorphism Header */}
      <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50 border-b border-border/10 bg-background/40 dark:bg-black/40 backdrop-blur-3xl">
        <Link className="flex items-center gap-4 group" href="/customer/dashboard">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary/20 group-hover:scale-110 transition-transform duration-500">
            <Milk className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-xl italic tracking-tighter text-foreground uppercase leading-none">
              DairyDays <span className="text-primary italic">Elite</span>
            </span>
            <span className="font-micro text-[0.5rem] tracking-[0.4em] text-foreground/20 uppercase mt-1">Authenticated Session</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border border-border/10 bg-foreground/5 hover:bg-primary/5 relative group transition-all duration-500 shadow-inner">
                  <Bell size={20} className={cn("transition-all duration-500", totalCount > 0 ? "text-primary drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]" : "text-foreground/40 group-hover:text-primary")} />
                  {totalCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[18px] h-4.5 px-1 bg-primary text-[8px] font-black text-white flex items-center justify-center rounded-full shadow-glow-primary border-2 border-background animate-bounce-subtle">
                      {totalCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 border-border/50 bg-background/90 backdrop-blur-3xl rounded-3xl overflow-hidden glass-card p-4">
                <div className="p-4 border-b border-border/10">
                  <h4 className="font-heading font-black italic text-sm tracking-tight text-foreground uppercase">{t('notifications')}</h4>
                </div>
                <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {totalCount === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="h-12 w-12 rounded-2xl bg-foreground/5 border border-border/10 flex items-center justify-center mx-auto text-foreground/20">
                        <Bell size={24} />
                      </div>
                      <p className="font-micro text-[10px] tracking-widest text-foreground/40 uppercase italic">
                        {t('noNotifications') || "Status_Nominal"}
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-foreground/5 transition-all group border border-transparent hover:border-border/10"
                        >
                          <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform duration-500", item.bg, item.color, "border-current/20")}>
                            <Icon size={18} className="fill-current" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-black italic text-[11px] uppercase tracking-tight leading-tight">
                              {item.title}
                            </p>
                            <p className="text-[0.6rem] text-foreground/40 font-micro tracking-widest uppercase mt-1">
                              {item.type} :: ACTION_REQ
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-foreground/10 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      )
                    })
                  )}
                </div>
                {totalCount > 0 && (
                  <div className="p-4 border-t border-border/10 bg-foreground/[0.02]">
                    <Button
                      variant="ghost"
                      className="w-full text-[10px] font-black tracking-widest uppercase text-foreground/40 hover:text-primary transition-all rounded-xl h-10 border border-transparent hover:border-border/10"
                      onClick={() => { window.location.href = "/customer/dashboard" }}
                    >
                      {t('viewAll') || "System_Wide_Audit"}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Page Content Stream */}
      <main className="flex-1 relative z-10 pb-32">
        {children}
      </main>

      {/* High-Fidelity Tactile Navigation */}
      <MobileNav />
    </div>
  )
}
