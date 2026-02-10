"use client"

import Link from "next/link"
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
  Settings,
  Bell
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { authApi } from "@/lib/api"
import { useState, useEffect } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const adminNav = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "BILLING_ADMIN"] },
  { name: "Daily Entry", href: "/admin/daily-entry", icon: ClipboardCheck, badge: "Today", roles: ["ADMIN"] },
  { name: "Customers", href: "/admin/customers", icon: Users, roles: ["ADMIN"] },
  { name: "Consumption", href: "/admin/consumption", icon: Milk, roles: ["ADMIN", "BILLING_ADMIN"] },
  { name: "Bills", href: "/admin/bills", icon: Receipt, roles: ["ADMIN", "BILLING_ADMIN"] },
  { name: "Payments", href: "/admin/payments", icon: CreditCard, roles: ["ADMIN", "BILLING_ADMIN"] },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 duration-300">
            <Milk className="h-5 w-5 text-white" />
          </div>
        </div>
        <div>
          <span className="font-black text-xl tracking-tight bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">DairyOS</span>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Control Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-auto">
        <p className="px-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 opacity-50">Operations</p>
        {filteredNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobile && setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 font-bold group relative border border-transparent",
                isActive
                  ? "bg-slate-900 border-slate-800 text-white shadow-xl shadow-slate-900/20 dark:bg-white dark:text-slate-900 dark:shadow-white/10"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-300",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} />
              <span className="flex-1 text-sm tracking-tight">{item.name}</span>
              {item.badge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 font-black tracking-tighter uppercase",
                    isActive
                      ? "border-white/20 text-white bg-white/10 dark:border-slate-900/20 dark:text-slate-900 dark:bg-slate-900/10"
                      : "border-primary/20 text-primary bg-primary/5"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Profile Preview & Logout */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 p-3 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
          <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-blue-600/10 text-primary font-black text-xs">
              {userRole?.[0] || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black leading-none truncate uppercase tracking-tighter">
              {userRole === 'ADMIN' ? 'System Admin' : userRole === 'BILLING_ADMIN' ? 'Billing Manager' : 'Operator'}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold tracking-tight opacity-70">Active Session</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl h-11 transition-all duration-300 font-bold px-4"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary/10">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-border/20 sticky top-0 h-screen shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-40">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-border/20 sticky top-0 z-30 shadow-sm">
          {/* Mobile Menu Button */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="rounded-2xl transition-all active:scale-90 h-11 w-11 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-0 shadow-2xl">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <NavContent mobile />
            </SheetContent>
          </Sheet>

          {/* Search Placeholder / Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2">
             <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 scale-95 opacity-80">
               Operational Node :: 01
             </Badge>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative rounded-2xl h-11 w-11 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
            </Button>
            
            <div className="h-8 w-px bg-border/50 mx-1" />
            
            <ThemeToggle />
            
            <div className="hidden sm:flex items-center gap-3 pl-3">
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80 leading-tight">Live</p>
                  <p className="text-xs font-bold leading-none mt-0.5 whitespace-nowrap">Dashboard Active</p>
               </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
