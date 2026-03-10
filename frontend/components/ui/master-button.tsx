'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

/**
 * Master Button - Premium interactive button with animations
 * Use this instead of the basic shadcn button for premium feel
 */

interface MasterButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const variants = {
  primary: [
    'bg-primary text-white',
    'shadow-lg shadow-primary/30',
    'hover:shadow-primary/50 hover:bg-primary/90',
    'active:shadow-none',
  ],
  secondary: [
    'bg-white/[0.06] text-foreground',
    'border border-white/[0.12]',
    'hover:bg-white/[0.1] hover:border-white/[0.2]',
  ],
  ghost: [
    'bg-transparent text-foreground/70',
    'hover:bg-white/[0.06] hover:text-foreground',
  ],
  danger: [
    'bg-red-500 text-white',
    'shadow-lg shadow-red-500/30',
    'hover:shadow-red-500/50 hover:bg-red-600',
  ],
  success: [
    'bg-emerald-500 text-white',
    'shadow-lg shadow-emerald-500/30',
    'hover:shadow-emerald-500/50 hover:bg-emerald-600',
  ],
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function MasterButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  disabled,
  ...props
}: MasterButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      disabled={isDisabled}
      className={cn(
        // Base
        'relative inline-flex items-center justify-center gap-2',
        'rounded-xl font-semibold',
        'overflow-hidden',
        'transition-all duration-300 ease-smooth',
        
        // Disabled state
        isDisabled && 'opacity-50 cursor-not-allowed',
        
        // Full width
        fullWidth && 'w-full',
        
        // Variant
        variants[variant],
        
        // Size
        sizes[size],
        
        className
      )}
      {...props}
    >
      {/* Shine effect for primary */}
      {variant === 'primary' && !isDisabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
      )}
      
      {/* Icon */}
      {icon && !loading && (
        <span className="relative z-10">{icon}</span>
      )}
      
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}
      
      {/* Text */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

/**
 * Icon Button - For toolbars and compact actions
 */
interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  icon: ReactNode
  label: string
  variant?: 'default' | 'ghost' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  badge?: number
}

export function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  badge,
  className,
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  }

  const variantClasses = {
    default: 'bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1]',
    ghost: 'bg-transparent hover:bg-white/[0.06]',
    primary: 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      className={cn(
        'relative rounded-xl flex items-center justify-center',
        'text-foreground transition-all duration-300',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon}
      
      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  )
}
