/**
 * Design Tokens - Master Design System
 * Premium dark UI with glassmorphism 2.0, neon glows, cinematic depth
 */

// Color Palette - Premium Dark Mode
export const colors = {
  // Primary: Indigo with Milk Cream accent
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // Main primary
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    glow: 'rgba(99, 102, 241, 0.4)',
    glowIntense: 'rgba(99, 102, 241, 0.6)',
  },
  
  // Semantic colors
  success: {
    DEFAULT: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  warning: {
    DEFAULT: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  danger: {
    DEFAULT: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
  info: {
    DEFAULT: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  
  // Background scale (dark mode optimized)
  background: {
    DEFAULT: '#0a0a0f', // Deep void
    elevated: '#12121a', // Surface
    hover: '#1a1a25', // Elevated surface
    subtle: '#0f0f14', // Subtle variation
  },
  
  // Milk accent (dairy theme)
  milk: {
    cream: '#fef3c7',
    pure: '#ffffff',
    warm: '#fff7ed',
  },
  
  // Glass levels
  glass: {
    light: 'rgba(255, 255, 255, 0.03)',
    medium: 'rgba(255, 255, 255, 0.06)',
    strong: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.15)',
  },
};

// Spacing scale (Fibonacci-based)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
};

// Animation durations
export const duration = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
  slowest: '1000ms',
};

// Easing functions
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Shadows with glow effects
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
  glow: {
    primary: '0 0 30px -5px rgba(99, 102, 241, 0.3), 0 0 60px -10px rgba(99, 102, 241, 0.15)',
    success: '0 0 30px -5px rgba(16, 185, 129, 0.3)',
    danger: '0 0 30px -5px rgba(239, 68, 68, 0.3)',
    intense: '0 0 40px -5px rgba(99, 102, 241, 0.4), 0 0 80px -15px rgba(99, 102, 241, 0.2)',
    white: '0 0 30px -8px rgba(255, 255, 255, 0.15)',
  },
  glass: '0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
  elevated: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
};

// Border radius scale
export const radius = {
  none: '0',
  sm: '0.375rem',    // 6px
  DEFAULT: '0.625rem', // 10px
  md: '0.75rem',     // 12px
  lg: '1rem',        // 16px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.75rem',  // 28px
  full: '9999px',
  bento: '1.75rem',  // 28px - main UI radius
  card: '1.5rem',    // 24px
  button: '0.75rem',  // 12px
};

// Typography scale (mobile-optimized)
export const typography = {
  xs: { size: '0.75rem', lineHeight: '1rem' },      // 12px
  sm: { size: '0.875rem', lineHeight: '1.25rem' },  // 14px
  base: { size: '1rem', lineHeight: '1.5rem' },      // 16px
  lg: { size: '1.125rem', lineHeight: '1.75rem' },  // 18px
  xl: { size: '1.25rem', lineHeight: '1.75rem' },   // 20px
  '2xl': { size: '1.5rem', lineHeight: '2rem' },    // 24px
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px
  '4xl': { size: '2.25rem', lineHeight: '2.5rem' }, // 36px
  '5xl': { size: '3rem', lineHeight: '1' },         // 48px
  '6xl': { size: '3.75rem', lineHeight: '1' },      // 60px
};

// Z-index scale
export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 100,
  sticky: 200,
  banner: 300,
  overlay: 400,
  modal: 500,
  popover: 600,
  toast: 700,
  tooltip: 800,
};

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
};

// Animation variants for Framer Motion
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  
  // Stagger container
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },
  
  // Stagger item
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  
  // Page transition
  pageTransition: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  
  // Card hover
  cardHover: {
    rest: { scale: 1 },
    hover: { 
      scale: 1.02, 
      y: -4,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
      },
    },
    tap: { scale: 0.98 },
  },
  
  // Glow pulse
  glowPulse: {
    initial: { boxShadow: '0 0 20px -5px rgba(99, 102, 241, 0.3)' },
    animate: {
      boxShadow: [
        '0 0 20px -5px rgba(99, 102, 241, 0.3)',
        '0 0 40px -5px rgba(99, 102, 241, 0.5)',
        '0 0 20px -5px rgba(99, 102, 241, 0.3)',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
};

// Common transition presets
export const transitions = {
  fast: { duration: 0.15, ease: easing.out },
  default: { duration: 0.3, ease: easing.smooth },
  slow: { duration: 0.5, ease: easing.smooth },
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  bounce: { type: 'spring', stiffness: 300, damping: 20 },
};

// Glassmorphism utilities
export const glass = {
  base: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]',
  elevated: 'bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12]',
  hover: 'hover:bg-white/[0.08] hover:border-white/[0.15]',
  active: 'active:bg-white/[0.04] active:scale-[0.98]',
};

// Gradient presets
export const gradients = {
  primary: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
  success: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
  danger: 'bg-gradient-to-br from-red-500 to-red-700',
  glow: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
  text: 'bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent',
  subtle: 'bg-gradient-to-br from-white/[0.05] to-transparent',
  surface: 'bg-gradient-to-b from-white/[0.03] to-white/[0.01]',
};
