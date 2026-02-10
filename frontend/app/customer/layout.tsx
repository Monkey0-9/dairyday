"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Milk, LogOut, LayoutDashboard, Calendar, FileText, CreditCard } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { authApi } from "@/lib/api"

const tabs = [
  { href: "/customer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/customer/calendar", label: "Calendar", icon: Calendar },
  { href: "/customer/records", label: "Records", icon: FileText },
  { href: "/customer/payment", label: "Pay", icon: CreditCard },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const handleLogout = () => {
    authApi.logout()
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#0a0a0a" }}>
      {/* Animated background gradient */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.04) 0%, transparent 50%)",
        }}
      />

      {/* Glassmorphism header */}
      <header
        className="h-14 flex items-center justify-between px-5 sticky top-0 z-50 border-b border-white/[0.06]"
        style={{
          background: "rgba(10,10,10,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <Link className="flex items-center gap-2.5" href="/customer/dashboard">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Milk className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white">
            DairyOS
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Page content with animation */}
      <main className="flex-1 relative z-10 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom tab bar — glassmorphism */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto h-[68px]">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 relative group"
              >
                {/* Active indicator line */}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-indigo-500"
                    style={{ boxShadow: "0 0 12px 2px rgba(99,102,241,0.5)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive
                      ? "text-indigo-400"
                      : "text-neutral-600 group-hover:text-neutral-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                    isActive
                      ? "text-indigo-400"
                      : "text-neutral-600 group-hover:text-neutral-400"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
