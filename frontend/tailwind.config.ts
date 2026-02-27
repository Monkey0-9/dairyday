import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
        // Cream & Indigo Design System
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Surface layers
        surface: {
          DEFAULT: "hsl(var(--card))",
          elevated: "hsl(var(--popover))",
          hover: "hsl(var(--muted))",
        },
        
        // Primary - Indigo
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(239 84% 60%)",
          glow: "rgba(99, 102, 241, 0.4)",
        },
        
        // Milk cream accent for dairy theme
        milk: {
          cream: "#fef3c7",
          pure: "#ffffff",
        },
        
        // Accent - Indigo
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          glow: "rgba(99, 102, 241, 0.3)",
        },
        
        // Semantic colors
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
        
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          border: "rgba(255, 255, 255, 0.08)",
          elevated: "hsla(var(--glass-elevated-bg))",
          'elevated-border': "hsla(var(--glass-elevated-border))",
        }
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
        bento: "28px",
      },
      spacing: {
        "fluid-1": "clamp(1rem, 2vw, 1.5rem)",
        "fluid-2": "clamp(2rem, 4vw, 3rem)",
        "fluid-3": "clamp(3rem, 6vw, 4.5rem)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        // Glow effects
        "glow": "0 0 30px -5px rgba(99, 102, 241, 0.3), 0 0 60px -10px rgba(99, 102, 241, 0.15)",
        "glow-sm": "0 0 15px -3px rgba(99, 102, 241, 0.25)",
        "glow-intense": "0 0 40px -5px rgba(99, 102, 241, 0.4), 0 0 80px -15px rgba(99, 102, 241, 0.2)",
        "glow-primary": "0 0 40px -10px rgba(99, 102, 241, 0.5)",
        "glow-accent": "0 0 40px -12px rgba(99, 102, 241, 0.4)",
        "glow-emerald": "0 0 30px -8px rgba(16, 185, 129, 0.4)",
        "glow-rose": "0 0 30px -8px rgba(244, 63, 94, 0.4)",
        "glow-amber": "0 0 30px -8px rgba(245, 158, 11, 0.4)",
        "glow-blue": "0 0 30px -8px rgba(59, 130, 246, 0.4)",
        "glow-white": "0 0 30px -8px rgba(255, 255, 255, 0.15)",
        // Glass elevation
        "glass-elev": "0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
        "glass-sm": "0 8px 16px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "noise": "url('/noise.png')",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "float": "float 8s ease-in-out infinite",
        "shimmer-sweep": "shimmerSweep 2.5s ease-in-out infinite",
        "liquid-entrance": "liquidEntrance 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scanline": "scanline 8s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "pulse-glow-heavy": "pulse-glow-heavy 5s ease-in-out infinite",
        "shimmer-slide": "shimmer-slide 8s linear infinite",
        "reveal-text": "reveal-text 1.5s cubic-bezier(0.77, 0, 0.175, 1) forwards",
      },
      transitionTimingFunction: {
        "glass": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "standard": "500ms",
        "slow": "800ms",
        "fast": "200ms",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
        shimmerSweep: {
          "0%": { transform: "translateX(-150%)" },
          "100%": { transform: "translateX(150%)" },
        },
        liquidEntrance: {
          "0%": { opacity: "0", transform: "scale(0.92) translateY(40px)", filter: "blur(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)", filter: "blur(0)" },
        },
        scanline: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "0% 100%" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(14, 165, 168, 0.4)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 20px 5px rgba(14, 165, 168, 0.2)", transform: "scale(1.02)" },
        },
        "pulse-glow-heavy": {
          "0%, 100%": { boxShadow: "0 0 20px -5px rgba(14, 165, 168, 0.3)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 40px 10px rgba(14, 165, 168, 0.5)", transform: "scale(1.05)" },
        },
        "shimmer-slide": {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        "reveal-text": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
}

export default config

