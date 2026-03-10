'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { format, isSameMonth } from 'date-fns'
import { 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Droplets, 
  Calendar, 
  TrendingUp, 
  Wallet, 
  Settings,
  Receipt,
  CheckCircle2,
  AlertCircle,
  LucideIcon
} from 'lucide-react'

import { GlassCard, StatCard } from '@/components/ui/glass-card'
import { MasterButton } from '@/components/ui/master-button'
import { IconButton } from '@/components/ui/master-button'
import { SkeletonCard, SkeletonStats } from '@/components/ui/glass-card'
import { useToast } from '@/components/ui/toast-provider'
import { consumptionApi, billsApi, authApi, paymentsApi } from '@/lib/api'

// Quick action component
const QuickAction = ({ href, icon: Icon, label, color }: { href: string; icon: LucideIcon; label: string; color: 'indigo' | 'emerald' | 'amber' | 'purple' }) => {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={href}
        className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] group`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-sm text-foreground/60 text-center">{label}</span>
      </Link>
    </motion.div>
  )
}

// Streak bars component
const StreakBars = ({ streak }: { streak: number }) => (
  <div className="flex gap-1 items-end h-10">
    {Array.from({ length: 7 }).map((_, i) => {
      const isActive = i < (streak % 7 || 7)
      return (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: isActive ? 40 : 16 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className={`w-3 rounded-full transition-all duration-500 ${
            isActive 
              ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-lg shadow-amber-500/30' 
              : 'bg-white/10'
          }`}
        />
      )
    })}
  </div>
)

export default function CustomerDashboard() {
  const { showToast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setUserId(authApi.getUserId())
    setSelectedMonth(new Date())
    setMounted(true)
  }, [])

  const monthStr = selectedMonth 
    ? format(selectedMonth, 'yyyy-MM')
    : format(new Date(), 'yyyy-MM')

  const { data: consumption, isLoading: isLoadingConsumption } = useQuery({
    queryKey: ['my-consumption', monthStr],
    queryFn: () => consumptionApi.getMine(monthStr).then(r => Array.isArray(r.data) ? r.data : (r.data.bills || r.data.items || r.data.data || [])).catch(() => []),
    enabled: !!userId,
    staleTime: 60_000,
  })

  const { data: bill, isLoading: isLoadingBill } = useQuery({
    queryKey: ['my-bill', monthStr],
    queryFn: () => billsApi.get(userId!, monthStr).then(r => {
      const b = Array.isArray(r.data) ? r.data : (r.data.bills || r.data.items || r.data.data || []);
      return b.length > 0 ? b[0] : null;
    }).catch(() => null),
    enabled: !!userId,
    staleTime: 60_000,
  })

  // Calculate stats
  const totalLiters = Number(consumption?.reduce(
    (acc: number, day: { quantity?: string | number; liters?: string | number }) => acc + Number(day.quantity || day.liters || 0),
    0
  )) || 0

  const streak = consumption?.reduce((count: number, day: { quantity?: string | number }) => {
    if (Number(day.quantity) > 0) return count + 1
    return count
  }, 0) || 0

  const activeDays = consumption?.filter((d: { quantity?: string | number; liters?: string | number }) => Number(d.quantity || d.liters || 0) > 0).length || 0
  const avgDaily = activeDays > 0 ? totalLiters / activeDays : 0

  const billAmount = Number(bill?.total_amount || bill?.amount || 0)
  const isPaid = bill?.status === 'PAID' || bill?.status === 'paid'

  const handlePayment = async () => {
    if (!bill?.id) return
    try {
      const res = await paymentsApi.createOrder(bill.id)
      window.location.href = res.data?.payment_url || '/customer/payment'
    } catch (error: { response?: { data?: { detail?: string } } } | unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      showToast({
        type: 'error',
        title: 'Payment failed',
        description: err.response?.data?.detail || 'Unable to process payment'
      })
    }
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (!selectedMonth) return
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1))
    if (direction === 'next' && isSameMonth(newDate, new Date())) return
    setSelectedMonth(newDate)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-heading-1 text-foreground">Dashboard</h1>
            <p className="text-body text-foreground/60 mt-1">Welcome back to DairyDay</p>
          </div>

          {/* Month selector */}
          <GlassCard padding="sm" className="flex items-center gap-2">
            <IconButton
              icon={<ChevronLeft className="w-5 h-5" />}
              label="Previous month"
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange('prev')}
            />
            
            <span className="px-4 py-2 text-lg font-semibold min-w-[140px] text-center">
              {mounted && selectedMonth 
                ? format(selectedMonth, 'MMMM yyyy')
                : '--'
              }
            </span>
            <IconButton
              icon={<ChevronRight className="w-5 h-5" />}
              label="Next month"
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange('next')}
              disabled={selectedMonth ? isSameMonth(selectedMonth, new Date()) : undefined}
            />
          </GlassCard>
        </motion.div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column - Bill and stats */}
          <div className="lg:col-span-8 space-y-6">
            {/* Bill card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard padding="lg" variant="elevated">
                {isLoadingBill ? (
                  <SkeletonCard />
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-sm text-foreground/60 uppercase tracking-wider">Amount Due</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-sm text-primary"></span>
                          <span className="text-display text-foreground">
                            ₹{billAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-primary/20 text-primary border border-primary/30'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Paid
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            Pending
                          </>
                        )}
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-white/[0.03]">
                        <div className="flex items-center gap-2 text-foreground/60 mb-1">
                          <Droplets className="w-4 h-4 text-primary" />
                          <span className="text-sm">Total Volume</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {totalLiters.toFixed(1)}
                          <span className="text-sm text-foreground/40 ml-1">L</span>
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.03]">
                        <div className="flex items-center gap-2 text-foreground/60 mb-1">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm">Daily Average</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                          {avgDaily.toFixed(1)}
                          <span className="text-sm text-foreground/40 ml-1">L</span>
                        </span>
                      </div>
                    </div>

                    <MasterButton
                      onClick={handlePayment}
                      disabled={isPaid || !bill}
                      loading={false}
                      fullWidth
                    >
                      {isPaid ? 'Payment Complete' : 'Pay Now'}
                      {!isPaid && <ArrowRight className="w-5 h-5" />}
                    </MasterButton>
                  </>
                )}
              </GlassCard>
            </motion.div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLoadingConsumption ? (
                <SkeletonStats count={2} />
              ) : (
                <>
                  <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Daily Average"
                    value={`${avgDaily.toFixed(1)} L`}
                    subtext="Based on active days"
                    color="primary"
                    delay={0.2}
                  />
                  
                  <StatCard
                    icon={<Calendar className="w-5 h-5" />}
                    label="Active Days"
                    value={activeDays}
                    subtext="This month"
                    color="success"
                    delay={0.3}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right column - Streak and quick actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Streak card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard padding="lg" className="relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
                
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Flame className="w-7 h-7" />
                    </div>
                    <span className="text-sm text-foreground/60">Current Streak</span>
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <span className="text-6xl font-black text-foreground italic">
                      {streak}
                    </span>
                    <StreakBars streak={streak} />
                  </div>
                  
                  <p className="text-sm text-foreground/40 mt-4">Keep going! You&apos;re doing great.</p>
                </div>
              </GlassCard>
            </motion.div>

            {/* Quick actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-3"
            >
              <QuickAction
                href="/customer/calendar"
                icon={Calendar}
                label="Calendar"
                color="indigo"
              />
              <QuickAction
                href="/customer/records"
                icon={Wallet}
                label="Records"
                color="emerald"
              />
              <QuickAction
                href="/customer/payment"
                icon={Receipt}
                label="Payments"
                color="amber"
              />
              <QuickAction
                href="/customer/settings"
                icon={Settings}
                label="Settings"
                color="purple"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Arrow icon
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  )
}
