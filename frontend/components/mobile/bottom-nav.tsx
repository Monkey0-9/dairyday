'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Calendar, 
  Settings,
  ClipboardList,
  Users,
  Receipt,
  BarChart3,
  Milk
} from 'lucide-react'

/**
 * Mobile Bottom Navigation
 * Premium bottom navigation for mobile users
 */

interface NavItem {
  icon: typeof Home
  label: string
  href: string
}

interface BottomNavProps {
  items: NavItem[]
}

// Customer navigation
export const customerNavItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/customer/dashboard' },
  { icon: Calendar, label: 'Calendar', href: '/customer/calendar' },
  { icon: Milk, label: 'Records', href: '/customer/records' },
  { icon: Receipt, label: 'Payment', href: '/customer/payment' },
  { icon: Settings, label: 'Settings', href: '/customer/settings' },
]

// Admin navigation
export const adminNavItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: ClipboardList, label: 'Entry', href: '/admin/daily-entry' },
  { icon: Users, label: 'Customers', href: '/admin/customers' },
  { icon: Receipt, label: 'Bills', href: '/admin/bills' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/consumption' },
]

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()
  const activeIndex = items.findIndex(item => 
    pathname.startsWith(item.href)
  )

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-white/[0.08]" />

      {/* Navigation items */}
      <div className="relative flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
        {items.map((item, index) => {
          const Icon = item.icon
          const isActive = activeIndex === index

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center min-w-[64px] py-2"
            >
              {/* Active indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="absolute -top-1 inset-x-4 h-1 rounded-full bg-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -4 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300',
                  isActive 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-foreground/40'
                )}
              >
                <Icon className="w-5 h-5" />
                
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl"
                  />
                )}
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  color: isActive ? '#6366f1' : 'rgba(255,255,255,0.4)',
                }}
                className="text-[10px] font-medium mt-1"
              >
                {item.label}
              </motion.span>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}


