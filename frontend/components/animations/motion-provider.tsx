'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Motion Provider - Wraps the app with smooth animations
 * Provides page transitions and reduced motion support
 */

interface MotionProviderProps {
  children: ReactNode;
}

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Wrapper div for page transitions
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to prevent SSR hydration issues
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation wrapper
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function StaggerContainer({ 
  children, 
  className = '',
  staggerDelay = 0.1 
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.05,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className = '' 
}: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade in wrapper
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

export function FadeIn({ 
  children, 
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.5,
}: FadeInProps) {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { y: 0, x: -20 },
    right: { y: 0, x: 20 },
    none: { y: 0, x: 0 },
  };

  const offset = directions[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover wrapper
interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
  rotate?: number;
}

export function HoverScale({ 
  children, 
  className = '',
  scale = 1.05,
  rotate = 0,
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale, rotate, transition: { duration: 0.3 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Parallax wrapper
interface ParallaxProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export function Parallax({ 
  children, 
  className = '',
  speed = 0.5 
}: ParallaxProps) {
  return (
    <motion.div
      initial={{ y: 0 }}
      whileInView={{ y: -20 * speed }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Glow pulse animation
interface GlowPulseProps {
  children: ReactNode;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'white';
  intensity?: 'light' | 'medium' | 'strong';
}

const glowColors = {
  primary: '99, 102, 241',
  success: '16, 185, 129',
  warning: '245, 158, 11',
  danger: '239, 68, 68',
  white: '255, 255, 255',
};

const glowIntensities = {
  light: '0.2',
  medium: '0.4',
  strong: '0.6',
};

export function GlowPulse({ 
  children, 
  className = '',
  color = 'primary',
  intensity = 'medium',
}: GlowPulseProps) {
  const colorValue = glowColors[color];
  const intensityValue = glowIntensities[intensity];

  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 20px -5px rgba(${colorValue}, ${intensityValue})`,
          `0 0 40px -5px rgba(${colorValue}, ${parseFloat(intensityValue) + 0.2})`,
          `0 0 20px -5px rgba(${colorValue}, ${intensityValue})`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating animation
interface FloatProps {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}

export function Float({ 
  children, 
  className = '',
  amplitude = 10,
  duration = 3,
}: FloatProps) {
  return (
    <motion.div
      animate={{
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Shimmer loading effect
interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className = '' }: ShimmerProps) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={{ opacity: 1 }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }}
      />
    </motion.div>
  );
}

// Counter animation
interface CounterProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

export function Counter({ 
  value, 
  className = '',
  prefix = '',
  suffix = '',
  duration = 1,
}: CounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {value.toLocaleString()}
      </motion.span>
      {suffix}
    </motion.span>
  );
}

// Reduced motion wrapper
interface ReducedMotionProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ReducedMotion({ 
  children, 
  fallback 
}: ReducedMotionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
