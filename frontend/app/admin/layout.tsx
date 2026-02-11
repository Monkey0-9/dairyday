"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  LogOut,
  Menu,
  CreditCard,
  Milk,
  ClipboardList,
  Moon,
  Sun,
  Bell
} from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { LanguageSelector } from "@/components/language-selector"


import { useTranslation } from "@/context/language-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)

  const sidebarItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: "/admin/dashboard" },
    { icon: ClipboardList, label: t('dailyEntry'), href: "/admin/daily-entry" },
    { icon: Users, label: t('customers'), href: "/admin/customers" },
    { icon: Milk, label: t('consumption'), href: "/admin/consumption" },
    { icon: FileText, label: t('bills'), href: "/admin/bills" },
    { icon: CreditCard, label: t('payments'), href: "/admin/payments" },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])


  return (
    <div className="min-h-screen bg-background dark:bg-[#0a0a0a] text-foreground dark:text-white selection:bg-indigo-500/30 font-sans transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card dark:bg-[#0a0a0a] border-r border-border dark:border-white/[0.08] transition-transform duration-300 transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border dark:border-white/[0.08]">
            <div className="h-8 w-8 rounded-xl bg-indigo-500 flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Milk className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">DairyDay</h1>
              <p className="text-[10px] text-muted-foreground dark:text-neutral-500 font-mono tracking-wider">DASHBOARD</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold text-muted-foreground dark:text-neutral-500 uppercase tracking-wider">
              Operations
            </div>
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    isActive
                      ? "text-primary-foreground bg-primary dark:text-white dark:bg-white/[0.08]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  )}
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-primary-foreground dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground dark:text-neutral-500 dark:group-hover:text-neutral-300"}`} />
                  {item.label}
                  {item.href === "/admin/daily-entry" && (
                    <span className="ml-auto text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 dark:border-indigo-500/30">
                      TODAY
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-card border border-border dark:bg-white/[0.05] dark:border-white/[0.05]">
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/30">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate text-foreground dark:text-white">SYSTEM ADMIN</p>
                <p className="text-[10px] text-green-500 dark:text-green-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                  Active Session
                </p>
              </div>
            </div>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.05] rounded-lg transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={`transition-all duration-300 min-h-screen flex flex-col ${
          isSidebarOpen ? "lg:ml-64" : ""
        }`}
      >
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border dark:border-white/[0.08] bg-background/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.05] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 dark:bg-white/[0.05] border border-border dark:border-white/[0.08]">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <span className="text-[10px] font-mono text-muted-foreground dark:text-neutral-400">OPERATIONAL NODE :: 01</span>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notification Bell with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.05] relative transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border border-background dark:border-[#0a0a0a]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                  <h4 className="font-semibold text-sm">Notifications</h4>
                  <p className="text-xs text-muted-foreground">You have no new notifications.</p>
                </div>
                <div className="p-4 text-center text-sm text-muted-foreground">
                  All caught up!
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-[1px] bg-border dark:bg-white/[0.08]" />
            
            <LanguageSelector />

            <div className="h-4 w-[1px] bg-border dark:bg-white/[0.08]" />
            
            {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground dark:text-neutral-400 dark:hover:text-white transition-colors"
                suppressHydrationWarning
              >
                <div className="hidden dark:block"><Moon className="h-4 w-4" /></div>
                <div className="block dark:hidden"><Sun className="h-4 w-4" /></div>
                <span className="text-xs font-medium uppercase">{mounted ? (theme === 'system' ? 'System' : theme) : ''}</span>
              </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 relative">
             {/* Background Gradients (only in dark mode) */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/[0.05] to-transparent pointer-events-none dark:block hidden" />
            <div className="relative z-10 text-foreground dark:text-neutral-200">
                {children}
            </div>
        </main>
      </div>
    </div>
  )
}
