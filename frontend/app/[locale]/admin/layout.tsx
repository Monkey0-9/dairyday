"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  Milk,
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Receipt,
  CreditCard,
  LogOut,
  Menu,
  Bell,
  HelpCircle,
  Zap,
  Fingerprint,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import {
  adminAuthApi,
  consumptionApi,
  registrationApi,
  authApi
} from "@/lib/api"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import LanguageSwitcher from "@/components/language-switcher"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { UserMenu } from "@/components/user-menu"

const adminNav = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "BILLING_ADMIN"] },
  { key: "dailyEntry", href: "/admin/daily-entry", icon: ClipboardCheck, badge: "Live", roles: ["ADMIN"] },
  { key: "customers", href: "/admin/customers", icon: Users, roles: ["ADMIN"] },
  { key: "consumption", href: "/admin/consumption", icon: Milk, roles: ["ADMIN", "BILLING_ADMIN"] },
  { key: "approvals", href: "/admin/approvals", icon: ClipboardCheck, badge: "New", roles: ["ADMIN"] },

  { key: "bills", href: "/admin/bills", icon: Receipt, roles: ["ADMIN", "BILLING_ADMIN"] },
  { key: "payments", href: "/admin/payments", icon: CreditCard, roles: ["ADMIN", "BILLING_ADMIN"] },
  { key: "registrations", href: "/admin/registrations", icon: Fingerprint, roles: ["ADMIN"] },
  { key: "passwordRequests", href: "/admin/password-requests", icon: Zap, roles: ["ADMIN"] },
  { key: "support", href: "/admin/support", icon: HelpCircle, roles: ["ADMIN"] },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Admin")
  const commonT = useTranslations("Common")
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    setUserRole(authApi.getUserRole())
  }, [])

  const handleLogout = () => {
    authApi.logout()
    window.location.href = "/"
  }

  const filteredNav = adminNav.filter(item =>
    !userRole || (item.roles && item.roles.includes(userRole))
  )

  // -- Polling Logic for Admin Notifications --

  interface PendingRequest {
    id: string;
    status: string;
  }

  // 1. Password Reset Requests
  const { data: passwordRequests = [] } = useQuery({
    queryKey: ["pending-password-requests"],
    queryFn: async () => {
      const res = await adminAuthApi.getPasswordRequests()
      return res.data.filter((r: PendingRequest) => r.status === 'PENDING')
    },
    enabled: userRole === 'ADMIN',
    staleTime: 60_000,
    refetchInterval: 60000,
  })

  // 2. Consumption Approvals
  const { data: consumptionRequests = [] } = useQuery({
    queryKey: ["pending-consumption-requests"],
    queryFn: async () => {
      const res = await consumptionApi.getRequests()
      return res.data
    },
    enabled: false,
    staleTime: 60_000,
    refetchInterval: 60000,
  })

  // 3. User Registrations
  const { data: registrationRequests = [] } = useQuery({
    queryKey: ["pending-registration-requests"],
    queryFn: async () => {
      const res = await registrationApi.getRequests()
      return res.data
    },
    enabled: false,
    staleTime: 60_000,
    refetchInterval: 60000,
  })

  const counts: Record<string, number> = {
    passwordRequests: passwordRequests.length,
    approvals: consumptionRequests.length,
    registrations: registrationRequests.length,
  }

  const totalPending = counts.passwordRequests + counts.approvals + counts.registrations

  // Notification Toast Logic
  const [prevTotal, setPrevTotal] = useState(0)
  useEffect(() => {
    if (totalPending > prevTotal) {
      toast.info(t('dashboard.notifications'), {
        description: `SYSLOG: ${totalPending} pending items require administrative oversight.`,
        action: {
          label: "View All",
          onClick: () => { window.location.href = "/admin/password-requests" }
        }
      })
    }
    setPrevTotal(totalPending)
  }, [totalPending, prevTotal, t])

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-background/40 dark:bg-black/40 backdrop-blur-3xl border-r border-border/50 transition-all duration-700">
      {/* Industrial Logo */}
      <div className="px-5 lg:px-6 py-5 lg:py-6 border-b border-border/10">
        <Link className="flex items-center gap-3 group" href="/admin/dashboard">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-glow-primary/20 group-hover:scale-110 transition-transform duration-500">
            <Milk className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-lg italic tracking-tighter text-foreground uppercase leading-none">
              DairyDays <span className="text-primary italic">Elite</span>
            </span>
            <span className="font-micro text-[0.45rem] tracking-[0.4em] text-foreground/20 uppercase mt-0.5">ADMIN_SESSION_v4.2</span>
          </div>
        </Link>
      </div>

      {/* Tactile Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[0.5rem] font-black text-foreground/10 uppercase tracking-[0.4em] mb-4 italic">{t('dashboard.operations')}</p>
        {filteredNav.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 font-heading font-black italic relative group",
                isActive
                  ? "bg-primary/5 text-primary border border-primary/20 shadow-glow-primary/5 shadow-inner"
                  : "text-foreground/40 hover:text-foreground hover:bg-foreground/[0.03] border border-transparent hover:border-border/50"
              )}
            >
              {isActive && (
                <motion.div layoutId="active-nav" className="absolute left-1 w-1 h-6 bg-primary rounded-full shadow-glow-primary" />
              )}
              <Icon className={cn(
                "h-4 w-4 transition-all duration-500",
                isActive ? "scale-110 shadow-glow-primary" : "group-hover:scale-110 group-hover:text-primary"
              )} />
              <span className="flex-1 text-[11px] uppercase tracking-tighter">{t(`nav.${item.key}`)}</span>
              {(item.badge || counts[item.key] > 0) && (
                <Badge
                  className={cn(
                    "text-[0.4375rem] lg:text-[0.5rem] px-1.5 lg:px-2 py-0.5 font-micro tracking-widest uppercase rounded-lg",
                    isActive
                      ? "bg-primary text-white"
                      : (counts[item.key] > 0
                        ? "bg-primary/20 text-primary border-primary/20 animate-pulse"
                        : "bg-foreground/5 text-foreground/40 border-foreground/5")
                  )}
                >
                  {counts[item.key] > 0 ? counts[item.key] : item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Secure Session Status */}
      <div className="p-4 border-t border-border/10 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-border/10">
          <div className="h-8 w-8 rounded-lg bg-foreground/5 border border-border/10 flex items-center justify-center text-foreground/20">
            <Fingerprint size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black leading-none truncate uppercase tracking-widest text-foreground/40 italic">
              {userRole === 'ADMIN' ? 'ROOT_ADMIN' : 'OP_NODE'}
            </p>
            <p className="text-[8px] text-primary font-black tracking-widest uppercase mt-0.5 opacity-60 animate-pulse">Live_Sync</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-10 justify-start px-4 rounded-lg text-foreground/40 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-500 font-heading font-black italic text-[10px] tracking-widest uppercase"
        >
          <LogOut className="mr-3 h-3.5 w-3.5" />
          {commonT('signOut')}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-[100dvh] bg-background selection:bg-primary/20 text-foreground font-sans overflow-hidden">
      {/* Desktop Sidebar Rail */}
      <aside className="hidden lg:block w-72 sticky top-0 h-screen z-40">
        <NavContent />
      </aside>

      {/* Global Interface Rail */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-full overflow-y-auto custom-scrollbar">
        {/* Cinematic Header Control */}
        <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 bg-background/40 dark:bg-black/40 backdrop-blur-3xl border-b border-border/10 shrink-0 z-50">
          <div className="flex items-center gap-6">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-border/10 bg-foreground/5 hover:bg-foreground/10">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-none">
                <NavContent mobile />
              </SheetContent>
            </Sheet>

            <Badge className="hidden sm:flex bg-foreground/5 text-foreground/40 border border-border/10 font-micro text-[0.5625rem] uppercase tracking-[0.4em] px-4 py-1.5 rounded-full italic">
              SYS_ACTIVE :: LOG_N01
            </Badge>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <LanguageSwitcher />
            </div>

            <div className="h-8 w-[1px] bg-border/50 mx-2" />

            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl border border-border/10 bg-foreground/5 hover:bg-primary/5 relative group transition-all duration-500 shadow-inner">
                    <Bell size={20} className={cn("transition-all duration-500", totalPending > 0 ? "text-primary drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]" : "text-foreground/40 group-hover:text-primary")} />
                    {totalPending > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-primary text-[9px] font-black text-white flex items-center justify-center rounded-full shadow-glow-primary border-2 border-background animate-bounce-subtle">
                        {totalPending}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 border-border/50 bg-background/90 backdrop-blur-3xl rounded-3xl overflow-hidden glass-card p-4">
                  <div className="p-4 border-b border-border/10">
                    <h4 className="font-heading font-black italic text-sm tracking-tight text-foreground uppercase">{t('dashboard.notifications')}</h4>
                  </div>
                  <div className="py-4 space-y-2">
                    {totalPending === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <div className="h-12 w-12 rounded-2xl bg-foreground/5 border border-border/10 flex items-center justify-center mx-auto text-foreground/20">
                          <Bell size={24} />
                        </div>
                        <p className="font-micro text-[10px] tracking-widest text-foreground/40 uppercase italic">
                          {t('dashboard.noNotifications') || "System_Clear"}
                        </p>
                      </div>
                    ) : (
                      [
                        { key: "passwordRequests", label: t('nav.passwordRequests'), icon: Zap, href: "/admin/password-requests" },
                        { key: "approvals", label: t('nav.approvals'), icon: ClipboardCheck, href: "/admin/approvals" },
                        { key: "registrations", label: t('nav.registrations'), icon: Fingerprint, href: "/admin/registrations" },
                      ]
                        .filter(item => counts[item.key] > 0)
                        .map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-foreground/5 transition-all group border border-transparent hover:border-border/10"
                            >
                              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                <Icon size={18} className="fill-current" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-heading font-black italic text-xs uppercase tracking-tight truncate">
                                  {item.label}
                                </p>
                                <p className="text-[0.625rem] text-primary font-black tracking-widest uppercase mt-0.5 opacity-60">
                                  {counts[item.key]} PENDING_TASKS
                                </p>
                              </div>
                            </Link>
                          )
                        })
                    )}
                  </div>
                  {totalPending > 0 && (
                    <div className="p-4 border-t border-border/10 bg-foreground/[0.02]">
                      <Button
                        variant="ghost"
                        className="w-full text-[10px] font-black tracking-widest uppercase text-foreground/40 hover:text-primary transition-all rounded-xl h-10 border border-transparent hover:border-border/10"
                        onClick={() => { window.location.href = "/admin/password-requests" }}
                      >
                        {t('dashboard.viewAll') || "System_Oversight_Mode"}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <UserMenu />
            </div>

            <div className="hidden xl:flex items-center gap-4 pl-6 border-l border-border/10">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow-emerald animate-pulse" />
              <div>
                <p className="font-micro text-[0.5rem] uppercase tracking-[0.4em] text-foreground/40">Protocol</p>
                <p className="font-heading font-black italic text-xs uppercase text-foreground/90 tracking-tighter">Live_Control</p>
              </div>
            </div>
          </div>
        </header>

        {/* Cinematic Main Viewport */}
        <main className="flex-1 p-3 lg:p-6 max-w-[1700px] mx-auto w-full space-y-6 lg:space-y-12 pb-16">
          {children}
        </main>
      </div>
    </div>
  )
}
