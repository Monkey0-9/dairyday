'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Glass Card - Premium glassmorphism card component
 * The foundation of the DairyDay design system
 */

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'hoverable' | 'interactive'
  padding?: 'sm' | 'md' | 'lg' | 'none'
  glowOnHover?: boolean
  glowColor?: 'primary' | 'success' | 'warning' | 'danger'
}

const paddings = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const glowColors = {
  primary: 'hover:shadow-glow',
  success: 'hover:shadow-glow-success',
  warning: 'hover:shadow-glow-warning',
  danger: 'hover:shadow-glow-danger',
}

export function GlassCard({
  children,
  variant = 'default',
  padding = 'md',
  glowOnHover = true,
  glowColor = 'primary',
  className,
  ...props
}: GlassCardProps) {
  const baseClasses = cn(
    // Base glass styles
    'relative overflow-hidden',
    'bg-white/[0.03]',
    'backdrop-blur-xl',
    'border border-white/[0.08]',
    'rounded-2xl',
    
    // Top shine line
    'before:absolute before:inset-x-0 before:top-0 before:h-px',
    'before:bg-gradient-to-r before:from-transparent before:via-white/[0.1] before:to-transparent',
    
    // Padding
    paddings[padding],
    
    // Variant styles
    variant === 'elevated' && 'bg-white/[0.06] border-white/[0.12] shadow-glass-lg',
    variant === 'hoverable' && cn(
      'transition-all duration-500 ease-smooth',
      'hover:bg-white/[0.06] hover:border-white/[0.15]',
      glowOnHover && glowColors[glowColor]
    ),
    variant === 'interactive' && cn(
      'cursor-pointer',
      'transition-all duration-300 ease-smooth',
      'hover:bg-white/[0.06] hover:border-white/[0.15]',
      'active:scale-[0.98]',
      glowOnHover && glowColors[glowColor]
    ),
    
    className
  )

  if (variant === 'interactive') {
    return (
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        className={baseClasses}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={baseClasses}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stat Card - For dashboard metrics with animated values
 */
interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  delay?: number
  onClick?: () => void
}

const colorStyles = {
  primary: 'text-primary bg-primary/10 border-primary/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  danger: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-foreground/60 bg-white/5 border-white/10',
}

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
}

export function StatCard({
  icon,
  label,
  value,
  subtext,
  trend,
  trendValue,
  color = 'primary',
  delay = 0,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={onClick ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        'group relative p-6 rounded-2xl',
        'bg-white/[0.03] backdrop-blur-xl',
        'border border-white/[0.08]',
        'overflow-hidden',
        'transition-all duration-500 ease-smooth',
        'hover:bg-white/[0.06] hover:border-white/[0.15]',
        onClick && 'cursor-pointer active:scale-[0.98]'
      )}
    >
      {/* Background glow on hover */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-gradient-to-br from-primary to-transparent" />
      
      {/* Icon */}
      <div className={cn(
        'relative w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110',
        colorStyles[color]
      )}>
        {icon}
      </div>
      
      {/* Content */}
      <div className="mt-4 relative">
        <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
          {label}
        </p>
        
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          
          {trend && trendValue && (
            <span className={cn(
              'text-xs font-medium',
              trend === 'up' && 'text-emerald-400',
              trend === 'down' && 'text-red-400',
              trend === 'neutral' && 'text-foreground/40'
            )}>
              {trendIcons[trend]} {trendValue}
            </span>
          )}
        </div>
        
        {subtext && (
          <p className="text-xs text-foreground/40 mt-1">{subtext}</p>
        )}
      </div>
      
      {/* Bottom indicator line */}
      <div className={cn(
        'absolute bottom-0 left-6 right-6 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left',
        color === 'primary' && 'bg-primary',
        color === 'success' && 'bg-emerald-500',
        color === 'warning' && 'bg-amber-500',
        color === 'danger' && 'bg-red-500',
        color === 'neutral' && 'bg-white/30'
      )} />
    </motion.div>
  )
}

/**
 * Skeleton Card for loading states
 */
export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.05]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] skeleton shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 bg-white/[0.05] skeleton rounded" />
              <div className="h-3 w-1/2 bg-white/[0.05] skeleton rounded" />
            </div>
          </div>
        </motion.div>
      ))}
    </>
  )
}

/**
 * Skeleton Stats - Loading state for stats grid
 */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] skeleton mb-4" />
          <div className="h-6 w-24 skeleton rounded mb-2" />
          <div className="h-4 w-16 skeleton rounded" />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Feature Card - For showcasing features
 */
interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  delay?: number
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-500 cursor-pointer"
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Icon container */}
      <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg">
        {icon}
      </div>
      
      {/* Content */}
      <div className="relative">
        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-500">
          {title}
        </h3>
        <p className="text-sm text-foreground/60 leading-relaxed">
          {description}
        </p>
      </div>
      
      {/* Bottom line indicator */}
      <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </motion.div>
  )
}
