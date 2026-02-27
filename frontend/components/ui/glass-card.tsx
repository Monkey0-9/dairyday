import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const glassCardVariants = cva(
  "relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-300",
  {
    variants: {
      variant: {
        default: [
          "bg-[#12121a]/60",
          "border-[rgba(99,102,241,0.2)]",
          "shadow-2xl shadow-black/40",
          "hover:shadow-indigo-500/20 hover:border-indigo-500/40",
        ],
        elevated: [
          "bg-[#1a1a25]/80",
          "border-[rgba(99,102,241,0.3)]",
          "shadow-glass-elev",
          "hover:shadow-glow hover:border-indigo-500/50",
        ],
        glow: [
          "bg-[#12121a]/70",
          "border-indigo-500/30",
          "shadow-glow",
          "hover:shadow-glow-intense",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-500/10 before:to-transparent before:opacity-50",
        ],
        milk: [
          "bg-[#12121a]/60",
          "border-[rgba(254,243,199,0.2)]",
          "shadow-2xl shadow-black/40",
          "hover:shadow-[rgba(254,243,199,0.15)] hover:border-[rgba(254,243,199,0.4)]",
        ],
        flat: [
          "bg-[#1a1a25]",
          "border-[rgba(255,255,255,0.08)]",
          "hover:border-[rgba(255,255,255,0.15)]",
        ],
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
      },
      interactive: {
        true: "cursor-pointer active:scale-[0.98] tap-bounce",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean
  glow?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, interactive, glow, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          glassCardVariants({ variant, size, interactive }),
          glow && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-500/10 before:to-transparent before:opacity-30",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard, glassCardVariants }
