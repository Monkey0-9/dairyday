"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Milk } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import LanguageSwitcher from "@/components/language-switcher"
import { MobileNav } from "@/components/mobile-nav"
import { UserMenu } from "@/components/user-menu"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30 text-foreground">
      {/* High-Fidelity Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[60%] h-[40%] bg-primary/5 blur-[150px] rounded-full opacity-30 animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-emerald-500/5 blur-[150px] rounded-full opacity-20 animate-pulse-glow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Glassmorphism Header */}
      <header className="h-20 flex items-center justify-between px-8 sticky top-0 z-50 border-b border-border/10 bg-background/40 dark:bg-black/40 backdrop-blur-3xl">
        <Link className="flex items-center gap-4 group" href="/customer/dashboard">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary/20 group-hover:scale-110 transition-transform duration-500">
            <Milk className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-xl italic tracking-tighter text-foreground uppercase leading-none">
              DairyDay <span className="text-primary italic">Elite</span>
            </span>
            <span className="font-micro text-[0.5rem] tracking-[0.4em] text-foreground/20 uppercase mt-1">SECURE_NODE_L3</span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <UserMenu />
        </div>
      </header>

      {/* Page Content Stream */}
      <main className="flex-1 relative z-10 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* High-Fidelity Tactile Navigation */}
      <MobileNav />
    </div>
  )
}
