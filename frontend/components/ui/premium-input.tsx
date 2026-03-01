'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, LucideIcon } from 'lucide-react'
import { useState, forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Premium Input - Glassmorphism input with animations
 */

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: LucideIcon
  rightIcon?: React.ReactNode
  isPassword?: boolean
}

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ label, error, icon: Icon, rightIcon, isPassword, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const inputType = isPassword 
      ? (showPassword ? 'text' : 'password') 
      : type

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
            {label}
          </label>
        )}
        
        <div className="relative group">
          {/* Left icon */}
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors">
              <Icon className="w-5 h-5" />
            </div>
          )}
          
          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full px-4 py-4 rounded-xl',
              'bg-white/[0.03] border border-white/[0.08]',
              'text-foreground placeholder:text-foreground/30',
              'focus:outline-none',
              'transition-all duration-300',
              
              // Hover state
              'hover:bg-white/[0.05] hover:border-white/[0.12]',
              
              // Focus state
              isFocused && 'bg-white/[0.06] border-primary/50 shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]',
              
              // Error state
              error && 'border-red-500/50 focus:border-red-500',
              
              // Icon padding
              Icon && 'pl-12',
              
              // Right icon/password padding
              (rightIcon || isPassword) && 'pr-12',
              
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {/* Animated bottom border on focus */}
          <motion.div
            className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ 
              scaleX: isFocused ? 1 : 0, 
              opacity: isFocused ? 1 : 0 
            }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Password toggle */}
          {isPassword && (
            <motion.button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </motion.button>
          )}
          
          {/* Right icon */}
          {!isPassword && rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {rightIcon}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400 flex items-center gap-1"
          >
            <span>&times;</span>
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)

PremiumInput.displayName = 'PremiumInput'

/**
 * Premium Textarea - For multi-line input
 */
interface PremiumTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const PremiumTextarea = forwardRef<HTMLTextAreaElement, PremiumTextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
            {label}
          </label>
        )}
        
        <div className="relative group">
          <textarea
            ref={ref}
            className={cn(
              'w-full px-4 py-4 rounded-xl min-h-[120px] resize-y',
              'bg-white/[0.03] border border-white/[0.08]',
              'text-foreground placeholder:text-foreground/30',
              'focus:outline-none',
              'transition-all duration-300',
              'hover:bg-white/[0.05] hover:border-white/[0.12]',
              isFocused && 'bg-white/[0.06] border-primary/50',
              error && 'border-red-500/50 focus:border-red-500',
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {/* Animated bottom border */}
          <motion.div
            className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ 
              scaleX: isFocused ? 1 : 0, 
              opacity: isFocused ? 1 : 0 
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)

PremiumTextarea.displayName = 'PremiumTextarea'

/**
 * Search Input - For search/filter functionality
 */
interface SearchInputProps extends PremiumInputProps {
  onClear?: () => void
  isLoading?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, isLoading, value, ...props }, ref) => {
    return (
      <div className="relative">
        <PremiumInput
          ref={ref}
          value={value}
          {...props}
          className="pl-10"
        />
        
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30">
          {isLoading ? (
            <motion.div
              className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        
        {/* Clear button */}
        {value && onClear && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
          >
            <span className="sr-only">Clear</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
