import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Dark theme background scale
        background: '#0a0a0f',
        foreground: '#fafafa',
        
        // Surface elevation
        surface: {
          DEFAULT: '#12121a',
          elevated: '#1a1a25',
          hover: '#232330',
        },
        
        // Primary: Indigo
        primary: {
          DEFAULT: '#6366f1',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          glow: 'rgba(99, 102, 241, 0.4)',
        },
        
        // Milk accent colors
        milk: {
          cream: '#fef3c7',
          pure: '#ffffff',
          warm: '#fff7ed',
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
        
        // shadcn compatibility
        card: {
          DEFAULT: '#12121a',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#1a1a25',
          foreground: '#fafafa',
        },
        secondary: {
          DEFAULT: '#1a1a25',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#232330',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#6366f1',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: 'rgba(255, 255, 255, 0.08)',
        input: 'rgba(255, 255, 255, 0.08)',
        ring: '#6366f1',
      },
      
      borderRadius: {
        lg: '1rem',
        md: '0.75rem',
        sm: '0.5rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.75rem',
      },
      
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      
      fontSize: {
        'display': ['3rem', { lineHeight: '1', fontWeight: '900' }],
        'display-sm': ['2rem', { lineHeight: '1.1', fontWeight: '800' }],
        'heading-1': ['1.75rem', { lineHeight: '1.2', fontWeight: '800' }],
        'heading-2': ['1.5rem', { lineHeight: '1.25', fontWeight: '700' }],
        'heading-3': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
        'micro': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.05em' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      
      boxShadow: {
        // Glow effects
        'glow': '0 0 30px -5px rgba(99, 102, 241, 0.3), 0 0 60px -10px rgba(99, 102, 241, 0.15)',
        'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 40px -5px rgba(99, 102, 241, 0.4), 0 0 80px -15px rgba(99, 102, 241, 0.2)',
        'glow-success': '0 0 30px -5px rgba(16, 185, 129, 0.3)',
        'glow-danger': '0 0 30px -5px rgba(239, 68, 68, 0.3)',
        
        // Glass elevation
        'glass': '0 8px 32px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-lg': '0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        
        // Subtle
        'subtle': '0 2px 8px -2px rgba(0, 0, 0, 0.3)',
      },
      
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-up': 'fade-up 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
      
      backdropBlur: {
        'xs': '2px',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
