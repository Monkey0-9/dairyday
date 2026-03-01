'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Milk, 
  Sparkles,
  Zap
} from 'lucide-react';
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Premium Toast Notification System
 * Elegant, animated notifications with glassmorphism
 */

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'milk' | 'celebration';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto hide
    if (toast.duration !== 0) {
      setTimeout(() => {
        hideToast(id);
      }, toast.duration || 5000);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Toast icons
const toastIcons = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  milk: <Milk className="w-5 h-5" />,
  celebration: <Sparkles className="w-5 h-5" />,
};

// Toast styles
const toastStyles = {
  success: {
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    bar: 'from-emerald-500 to-emerald-400',
  },
  error: {
    iconBg: 'bg-red-500/20 text-red-400 border-red-500/30',
    glow: 'shadow-red-500/20',
    bar: 'from-red-500 to-red-400',
  },
  warning: {
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glow: 'shadow-amber-500/20',
    bar: 'from-amber-500 to-amber-400',
  },
  info: {
    iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    glow: 'shadow-blue-500/20',
    bar: 'from-blue-500 to-blue-400',
  },
  milk: {
    iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    glow: 'shadow-indigo-500/20',
    bar: 'from-indigo-500 to-indigo-400',
  },
  celebration: {
    iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    glow: 'shadow-purple-500/20',
    bar: 'from-purple-500 via-pink-500 to-purple-500',
  },
};

// Toast container
function ToastContainer({ 
  toasts, 
  onHide 
}: { 
  toasts: ToastItem[]; 
  onHide: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItemComponent key={toast.id} toast={toast} onHide={onHide} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Individual toast
function ToastItemComponent({ 
  toast, 
  onHide 
}: { 
  toast: ToastItem; 
  onHide: (id: string) => void;
}) {
  const style = toastStyles[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        transition: { 
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }
      }}
      exit={{ 
        opacity: 0, 
        x: 100, 
        scale: 0.9,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'relative w-[380px] pointer-events-auto overflow-hidden',
        'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]',
        'rounded-2xl shadow-2xl',
        style.glow
      )}
    >
      {/* Progress bar */}
      <motion.div
        className={cn('absolute bottom-0 left-0 h-[2px] bg-gradient-to-r', style.bar)}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ 
          duration: (toast.duration || 5000) / 1000,
          ease: 'linear',
        }}
      />

      {/* Content */}
      <div className="p-4 flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
          style.iconBg
        )}>
          {toastIcons[toast.type]}
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

      {/* Top shine line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
}

// Quick toast functions
export const toast = {
  success: (title: string, description?: string) => {
    const { showToast } = useToast();
    showToast({ type: 'success', title, description });
  },
  error: (title: string, description?: string) => {
    const { showToast } = useToast();
    showToast({ type: 'error', title, description });
  },
  warning: (title: string, description?: string) => {
    const { showToast } = useToast();
    showToast({ type: 'warning', title, description });
  },
  info: (title: string, description?: string) => {
    const { showToast } = useToast();
    showToast({ type: 'info', title, description });
  },
  milk: (title: string, description?: string) => {
    const { showToast } = useToast();
    showToast({ type: 'milk', title, description });
  },
  celebration: (title: string, description?: string) => {
    const { showToast } = useToast();
    showToast({ type: 'celebration', title, description, duration: 6000 });
  },
};

// Standalone toast buttons for testing
export function ToastTester() {
  const { showToast } = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      {(['success', 'error', 'warning', 'info', 'milk', 'celebration'] as ToastType[]).map((type) => (
        <button
          key={type}
          onClick={() => showToast({
            type,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
            description: 'This is a sample toast notification.',
          })}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium',
            'bg-white/[0.05] border border-white/10',
            'hover:bg-white/10 transition-colors'
          )}
        >
          Test {type}
        </button>
      ))}
    </div>
  );
}
