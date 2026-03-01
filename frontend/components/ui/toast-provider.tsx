'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Milk,
  Sparkles
} from 'lucide-react'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Premium Toast Notification System
 * Beautiful glassmorphism toasts with smooth animations
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'milk' | 'celebration'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Toast icons
const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  milk: Milk,
  celebration: Sparkles,
}

// Toast styles
const toastStyles = {
  success: {
    icon: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    accent: 'bg-emerald-500',
  },
  error: {
    icon: 'text-red-400 bg-red-500/20 border-red-500/30',
    accent: 'bg-red-500',
  },
  warning: {
    icon: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    accent: 'bg-amber-500',
  },
  info: {
    icon: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    accent: 'bg-blue-500',
  },
  milk: {
    icon: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
    accent: 'bg-indigo-500',
  },
  celebration: {
    icon: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    accent: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    const newToast = { ...toast, id }
    
    setToasts((prev) => [...prev, newToast])

    if (toast.duration !== 0) {
      setTimeout(() => {
        hideToast(id)
      }, toast.duration || 5000)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  )
}

// Toast container
function ToastContainer({ 
  toasts, 
  onHide 
}: { 
  toasts: Toast[] 
  onHide: (id: string) => void 
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={onHide} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Individual toast
function ToastItem({ 
  toast, 
  onHide 
}: { 
  toast: Toast 
  onHide: (id: string) => void 
}) {
  const Icon = toastIcons[toast.type]
  const style = toastStyles[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        transition: { type: 'spring', stiffness: 400, damping: 30 }
      }}
      exit={{ 
        opacity: 0, 
        x: 100, 
        scale: 0.9,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'relative w-[380px] pointer-events-auto overflow-hidden',
        'bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.08]',
        'rounded-2xl shadow-2xl'
      )}
    >
      {/* Progress bar */}
      <motion.div
        className={cn('absolute bottom-0 left-0 h-[2px]', style.accent)}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ 
          duration: (toast.duration || 5000) / 1000,
          ease: 'linear'
        }}
      />

      {/* Content */}
      <div className="p-4 flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
          style.icon
        )}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate">
            {toast.title}
          </h4>
          {toast.description && (
            <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
              {toast.description}
            </p>
          )}
        </div>

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onHide(toast.id)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-white/5 shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Top shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  )
}
