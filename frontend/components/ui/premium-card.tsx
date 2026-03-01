'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Premium Card Component
 * Glassmorphism with animations and glow effects
 */

interface PremiumCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'silent' | 'float';
  glow?: 'none' | 'primary' | 'success' | 'warning' | 'danger';
  hover?: boolean;
  clickable?: boolean;
}

const variants = {
  default: 'bg-white/[0.03] border border-white/[0.08]',
  elevated: 'bg-white/[0.06] border border-white/[0.12] shadow-2xl',
  silent: 'bg-white/[0.02] border-[0.5px] border-white/[0.04]',
  float: 'bg-white/[0.03] border border-white/[0.08]',
};

const glowStyles = {
  none: '',
  primary: 'hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]',
  success: 'hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]',
  warning: 'hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]',
  danger: 'hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]',
};

export function PremiumCard({
  children,
  variant = 'default',
  glow = 'primary',
  hover = true,
  clickable = false,
  className,
  ...props
}: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -4, transition: { duration: 0.3 } } : undefined}
      whileTap={clickable ? { scale: 0.98, transition: { duration: 0.1 } } : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl backdrop-blur-xl',
        variants[variant],
        glowStyles[glow],
        hover && 'hover:bg-white/[0.06] hover:border-white/[0.15]',
        clickable && 'cursor-pointer active:scale-[0.98]',
        variant === 'float' && 'animate-float',
        className
      )}
      {...props}
    >
      {/* Top shine line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Corner glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {children}
    </motion.div>
  );
}

/**
 * Premium Stat Card - For dashboard metrics
 */
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  delay?: number;
}

const colorStyles = {
  primary: 'text-primary bg-primary/10 border-primary/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  danger: 'text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-foreground/60 bg-white/5 border-white/10',
};

export function StatCard({
  icon,
  label,
  value,
  subtext,
  trend,
  trendValue,
  color = 'primary',
  delay = 0,
}: StatCardProps) {
  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-500"
    >
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Icon */}
      <div className={cn(
        'relative w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110',
        colorStyles[color]
      )}>
        {icon}
      </div>
      
      {/* Content */}
      <div className="mt-4">
        <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">{label}</p>
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
          <p className="text-xs text-foreground/30 mt-1">{subtext}</p>
        )}
      </div>
      
      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </motion.div>
  );
}

/**
 * Feature Card - For landing/features section
 */
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
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
      <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg group-hover:shadow-primary/30">
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
  );
}

/**
 * Glass Button - Premium button with multiple variants
 */
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: GlassButtonProps) {
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/30',
    secondary: 'bg-white/[0.06] border border-white/[0.12] text-foreground hover:bg-white/[0.1]',
    ghost: 'bg-transparent text-foreground/70 hover:bg-white/[0.06] hover:text-foreground',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
        'overflow-hidden transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Shine effect */}
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
      )}
      
      {loading ? (
        <>
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

/**
 * Loading Skeleton Components
 */
export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 skeleton rounded" />
              <div className="h-3 w-1/2 skeleton rounded" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] h-32"
        >
          <div className="w-10 h-10 rounded-xl skeleton mb-4" />
          <div className="h-6 w-24 skeleton rounded mb-2" />
          <div className="h-4 w-16 skeleton rounded" />
        </motion.div>
      ))}
    </div>
  );
}
