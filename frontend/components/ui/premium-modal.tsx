'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Milk } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

/**
 * Premium Modal System
 * Beautiful glassmorphism modals with smooth animations
 */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw]',
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    filter: 'blur(10px)'
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    filter: 'blur(10px)',
    transition: { duration: 0.2 }
  },
};

export function PremiumModal({
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Animated background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]"
            />
          </div>

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            className={cn(
              'relative w-full',
              sizeClasses[size],
              'bg-white/[0.03] backdrop-blur-2xl',
              'border border-white/[0.1]',
              'rounded-3xl shadow-2xl',
              'overflow-hidden',
              className
            )}
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
                  <p className="text-sm text-foreground/60 mt-1">
                    {description}
                  </p>
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
  );
}

// Confirmation Modal
interface ConfirmModalProps extends Omit<ModalProps, 'children'> {
  type?: 'info' | 'success' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  size = 'sm',
}: ConfirmModalProps) {
  const typeStyles = {
    info: {
      icon: <Info className="w-8 h-8 text-blue-400" />,
      iconBg: 'bg-blue-500/20 border-blue-500/30',
      confirmBtn: 'bg-blue-600 hover:bg-blue-500',
    },
    success: {
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
      iconBg: 'bg-emerald-500/20 border-emerald-500/30',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-500',
    },
    warning: {
      icon: <AlertCircle className="w-8 h-8 text-amber-400" />,
      iconBg: 'bg-amber-500/20 border-amber-500/30',
      confirmBtn: 'bg-amber-600 hover:bg-amber-500',
    },
    danger: {
      icon: <AlertCircle className="w-8 h-8 text-red-400" />,
      iconBg: 'bg-red-500/20 border-red-500/30',
      confirmBtn: 'bg-red-600 hover:bg-red-500',
    },
  };

  const style = typeStyles[type];

  return (
    <PremiumModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      showCloseButton={false}
    >
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center border mb-4',
          style.iconBg
        )}>
          {style.icon}
        </div>

        {/* Text */}
        {title && (
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-foreground/60 mb-6">{description}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-white/[0.05] border border-white/10 text-foreground font-medium hover:bg-white/10 transition-colors"
          >
            {cancelText}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-11 rounded-xl text-white font-medium transition-colors',
              style.confirmBtn,
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {loading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              confirmText
            )}
          </motion.button>
        </div>
      </div>
    </PremiumModal>
  );
}

// QR Modal for payments
interface QRModalProps extends Omit<ModalProps, 'children'> {
  qrCode?: string;
  upiId?: string;
  amount?: number;
  onCopy?: () => void;
}

export function QRModal({
  isOpen,
  onClose,
  qrCode,
  upiId,
  amount,
  onCopy,
}: QRModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (upiId && onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PremiumModal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan to Pay"
      description={amount ? `Amount: ₹${amount.toLocaleString('en-IN')}` : undefined}
      size="sm"
    >
      <div className="flex flex-col items-center">
        {/* QR Code */}
        <div className="relative p-4 rounded-2xl bg-white mb-6">
          {qrCode ? (
            <img
              src={qrCode}
              alt="Payment QR Code"
              className="w-48 h-48"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
          )}
          
          {/* Logo overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Milk className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* UPI ID */}
        {upiId && (
          <div className="w-full">
            <p className="text-xs text-foreground/40 uppercase tracking-wider mb-2 text-center">
              UPI ID
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopy}
              className="w-full p-4 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between group hover:bg-white/[0.1] transition-colors"
            >
              <span className="font-mono text-sm text-foreground">{upiId}</span>
              <span className={cn(
                'text-xs px-2 py-1 rounded-full transition-colors',
                copied 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-white/5 text-foreground/40 group-hover:bg-white/10'
              )}>
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </motion.button>
          </div>
        )}
      </div>
    </PremiumModal>
  );
}



// Drawer for mobile
interface DrawerProps extends Omit<ModalProps, 'size'> {
  position?: 'bottom' | 'right' | 'left';
}

export function PremiumDrawer({
  isOpen,
  onClose,
  children,
  title,
  position = 'bottom',
  className,
}: DrawerProps) {
  const positionVariants = {
    bottom: {
      hidden: { y: '100%' },
      visible: { y: 0 },
      exit: { y: '100%' },
    },
    right: {
      hidden: { x: '100%' },
      visible: { x: 0 },
      exit: { x: '100%' },
    },
    left: {
      hidden: { x: '-100%' },
      visible: { x: 0 },
      exit: { x: '-100%' },
    },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            variants={positionVariants[position]}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed z-[101] bg-background/95 backdrop-blur-2xl border border-white/[0.1]',
              position === 'bottom' && 'inset-x-0 bottom-0 rounded-t-3xl',
              position === 'right' && 'inset-y-0 right-0 w-full max-w-md rounded-l-3xl',
              position === 'left' && 'inset-y-0 left-0 w-full max-w-md rounded-r-3xl',
              className
            )}
          >
            {/* Handle bar for bottom drawer */}
            {position === 'bottom' && (
              <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-foreground/60 hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-auto max-h-[80vh]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
