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
        // (DairyDay) Elite: Industrial Elegance Palette
        background: "#020205",
        foreground: "#f8fafc",
        
        // Deep Obsidian Layers
        obsidian: {
          900: "#020205",
          800: "#050508",
          700: "#0A0A0F",
          600: "#12121A",
          500: "#1A1A24",
        },

        // Precision Accents
        primary: {
          DEFAULT: "#0EA5A8",
          glow: "rgba(14, 165, 168, 0.4)",
          foreground: "#FFFFFF",
        },
        
        accent: {
          DEFAULT: "#6366f1", // Indigo
          glow: "rgba(99, 102, 241, 0.3)",
        },
        
        // Semantic refined for dark mode
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        
        border: "rgba(255, 255, 255, 0.06)",
        input: "rgba(255, 255, 255, 0.03)",
        ring: "#0EA5A8",
        
        card: {
          DEFAULT: "rgba(10, 10, 15, 0.5)",
          foreground: "#f8fafc",
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
          DEFAULT: "rgba(255, 255, 255, 0.02)",
          border: "rgba(255, 255, 255, 0.05)",
        }
      },
      borderRadius: {
        sm: "10px",
        md: "18px",
        lg: "28px",
        xl: "34px",
        "2xl": "52px",
        bento: "3.5rem",
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
        "glow-primary": "0 0 40px -10px rgba(14, 165, 168, 0.5)",
        "glow-accent": "0 0 40px -12px rgba(99, 102, 241, 0.4)",
        "glass-elev": "0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "noise": "url('/noise.png')",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "shimmer-sweep": "shimmerSweep 2.5s ease-in-out infinite",
        "liquid-entrance": "liquidEntrance 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scanline": "scanline 8s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(14, 165, 168, 0.4)" },
          "50%": { boxShadow: "0 0 20px 5px rgba(14, 165, 168, 0.2)" },
        },
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
}

export default config

