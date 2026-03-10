'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Info } from 'lucide-react'
import { ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

/**
 * Premium Modal - Glassmorphism modal with animations
 */

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw]',
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
          </div>

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(10px)' }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              filter: 'blur(0px)',
              transition: { type: 'spring', stiffness: 400, damping: 30 }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95, 
              y: 20,
              filter: 'blur(10px)',
              transition: { duration: 0.2 }
            }}
            className={cn(
              'relative w-full',
              sizeClasses[size],
              'bg-[#12121a]/95 backdrop-blur-2xl',
              'border border-white/[0.1]',
              'rounded-3xl shadow-2xl',
              'overflow-hidden',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top shine line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Close button */}
            {showCloseButton && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="p-6 pb-0">
                {title && (
                  <h2 className="text-xl font-bold text-foreground pr-12">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-foreground/60 mt-1">{description}</p>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn('p-6', !title && !description && 'pt-6')}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Confirmation modal
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'danger' | 'warning'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  loading = false,
}: ConfirmModalProps) {
  const typeStyles = {
    info: {
      confirmBtn: 'bg-primary hover:bg-primary/90',
    },
    warning: {
      confirmBtn: 'bg-amber-600 hover:bg-amber-500',
    },
    danger: {
      confirmBtn: 'bg-red-600 hover:bg-red-500',
    },
  }

  const style = typeStyles[type]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        {/* Icon */}
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center border mx-auto mb-4',
          type === 'danger' && 'bg-red-500/10 border-red-500/20 text-red-400',
          type === 'warning' && 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          type === 'info' && 'bg-primary/10 border-primary/20 text-primary'
        )}>
          {type === 'danger' && <X className="w-8 h-8" />}
          {type === 'warning' && <AlertTriangle className="w-8 h-8" />}
          {type === 'info' && <Info className="w-8 h-8" />}
        </div>

        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        
        {description && (
          <p className="text-sm text-foreground/60 mt-2">{description}</p>
        )}

        <div className="flex gap-3 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-foreground font-medium hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl text-white font-medium transition-colors disabled:opacity-50',
              style.confirmBtn
            )}
          >
            {loading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              confirmText
            )}
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}

