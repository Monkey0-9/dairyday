"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, Calendar, FileText, CreditCard } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()
  const t = useTranslations("Nav")

  const tabs = [
    { href: "/customer/dashboard", label: t("overview"), icon: LayoutDashboard },
    { href: "/customer/calendar", label: t("calendar"), icon: Calendar },
    { href: "/customer/records", label: t("records"), icon: FileText },
    { href: "/customer/payment", label: t("pay"), icon: CreditCard },
  ]

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        className="pointer-events-auto w-full max-w-md bg-background/60 dark:bg-black/60 border border-border/10 rounded-[2.5rem] backdrop-blur-[30px] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.6)] flex items-center justify-between p-2"
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center gap-1 p-2 flex-1 group"
            >
              {isActive && (
                <motion.div
                  layoutId="dock-active"
                  className="absolute inset-0 bg-foreground/10 rounded-[1.8rem] border border-border/5"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className={cn(
                "relative z-10 p-2 rounded-xl transition-all duration-500",
                isActive ? "text-primary scale-110 shadow-glow-primary/50" : "text-foreground/40 group-hover:text-foreground"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={cn(
                "font-micro text-[9px] uppercase tracking-widest transition-all duration-300 relative z-10",
                isActive ? "text-foreground opacity-100 translate-y-0" : "text-foreground/20 opacity-0 -translate-y-2 group-hover:translate-y-0 group-hover:opacity-40"
              )}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </motion.nav>
    </div>
  )
}
