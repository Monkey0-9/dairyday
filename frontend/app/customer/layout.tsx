"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Milk, LogOut, LayoutDashboard, Calendar, FileText, CreditCard, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "@/context/language-context"

import { authApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useTranslation()

  const tabs = [
    { href: "/customer/dashboard", label: t('overview'), icon: LayoutDashboard },
    { href: "/customer/calendar", label: t('calendar'), icon: Calendar },
    { href: "/customer/records", label: t('records'), icon: FileText },
    { href: "/customer/payment", label: t('payment'), icon: CreditCard },
    { href: "/customer/settings", label: t('settings'), icon: Settings },
  ]

  const handleLogout = () => {
    authApi.logout()
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors duration-500">
      {/* Animated background gradient - more subtle in light mode */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.04) 0%, transparent 50%)",
        }}
      />

      {/* Glassmorphism header */}
      <header
        className="h-14 flex items-center justify-between px-5 sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
            <Link className="flex items-center gap-2.5" href="/customer/dashboard">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Milk className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-foreground">
                DairyDay

            </span>
            </Link>
        </div>
        <div className="flex items-center gap-3">
             <div className="md:block hidden">
                <ThemeToggle />
             </div>
            {/* Only show logout on larger screens or if not using the settings tab for logout */}
            <button
            onClick={handleLogout}
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors md:flex hidden"
            >
            <LogOut className="h-4 w-4" />
            </button>
        </div>
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
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-background/90 backdrop-blur-2xl"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto h-[72px]">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-1.5 flex-1 relative group"
              >
                {/* Active indicator line - Centered properly */}
                <div className="absolute top-0 inset-x-0 flex justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="h-[3px] w-10 rounded-full bg-indigo-500 z-10"
                        style={{ boxShadow: "0 0 15px rgba(99,102,241,0.5)" }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                </div>
                
                <Icon
                  className={`h-5 w-5 transition-all duration-300 ${
                    isActive
                      ? "text-indigo-500 scale-110"
                      : "text-neutral-500 group-hover:text-neutral-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-black tracking-widest transition-colors duration-300 uppercase ${
                    isActive
                      ? "text-indigo-500"
                      : "text-neutral-500 group-hover:text-neutral-400"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/919980592787"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-2xl shadow-emerald-500/40 text-white transition-shadow hover:shadow-emerald-500/60"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8 fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </motion.a>
    </div>
  )
}
