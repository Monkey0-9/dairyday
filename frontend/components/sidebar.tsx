"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  HelpCircle,
  ClipboardList,
  BarChart3,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Milk,
  Zap,
  Fingerprint,
  LucideIcon
} from 'lucide-react'

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: string;
}

// Define the nav items per role
export const adminSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'DASHBOARD', href: '/admin/dashboard' },
  { icon: ClipboardList, label: 'DAILYENTRY', href: '/admin/daily-entry', badge: 'LIVE' },
  { icon: Users, label: 'CUSTOMERS', href: '/admin/customers' },
  { icon: BarChart3, label: 'CONSUMPTION', href: '/admin/consumption' },
  { icon: ShieldCheck, label: 'APPROVALS', href: '/admin/approvals', badge: 'NEW' },
  { icon: FileText, label: 'BILLS', href: '/admin/bills' },
  { icon: CreditCard, label: 'PAYMENTS', href: '/admin/payments' },
]

export const customerSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'DASHBOARD', href: '/customer/dashboard' },
  { icon: BarChart3, label: 'CONSUMPTION', href: '/customer/consumption' },
  { icon: Milk, label: 'DAILY RECORD', href: '/customer/records' },
  { icon: CreditCard, label: 'PAYMENT', href: '/customer/payment' },
]

export function Sidebar({ role = 'admin' }: { role?: 'admin' | 'customer' }) {
  const pathname = usePathname() || ""
  const locale = useLocale()
  const items = role === 'admin' ? adminSidebarItems : customerSidebarItems

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore errors on logout
    } finally {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = `/${locale}/login`
    }
  }

  return (
    <aside className="hidden md:flex flex-col w-[260px] fixed inset-y-0 left-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-3xl border-r border-white/5">
      {/* Brand Header */}
      <div className="p-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Milk className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-black text-lg italic tracking-wider text-white">DAIRYDAYS<span className="text-primary">ELITE</span></h1>
            <p className="text-[9px] font-mono tracking-widest text-white/40 uppercase mt-0.5">
              {role === 'admin' ? 'ADMIN_SESSION_v4.2' : 'USER_SESSION_v4.2'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-4 py-2 layout-sidebar-scroll">
        <div className="mb-4 px-2">
          <span className="text-[10px] font-medium text-white/30 tracking-[0.2em] uppercase">Operations</span>
        </div>
        
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = pathname.includes(item.href)
            const Icon = item.icon

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="block relative group"
              >
                {isActive && (
                  <motion.div
                    layoutId={`sidebar-active-${role}`}
                    className="absolute inset-0 bg-white/[0.04] rounded-xl border border-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <div className={cn(
                  "relative flex items-center justify-between px-3 py-3 rounded-xl transition-colors",
                  isActive ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                )}>
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                    <span className="text-[11px] font-bold tracking-wider">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded flex items-center",
                      item.badge === 'LIVE' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                      "bg-white/5 text-white/60 border border-white/10"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
                {isActive && (
                   <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)] leading-none" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Profile Section */}
      <div className="p-4 mt-auto">
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <Fingerprint className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-white">
              {role === 'admin' ? 'ROOT_ADMIN' : 'PREMIUM_USER'}
            </div>
            <div className="text-[9px] font-mono tracking-widest text-[#6366f1] h-[12px] flex items-center">
              LIVE_SYNC <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] ml-2 animate-pulse" />
            </div>
          </div>
        </div>
        
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 text-white/40 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-colors group">
          <Zap className="w-4 h-4 group-hover:text-rose-400" />
          <span className="text-[11px] font-bold tracking-wider group-hover:text-rose-400">SIGN OUT</span>
        </button>
      </div>
    </aside>
  )
}
