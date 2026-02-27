"use client"

import { motion } from "framer-motion"
import { LucideIcon, AlertCircle, Loader2, Sparkles, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UIStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
  variant?: "default" | "glass" | "subtle"
}

export function PremiumStateDisplay({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "glass",
}: UIStateProps) {
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  }

  const iconVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      transition: { delay: 0.2, type: "spring", stiffness: 200 } 
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={cn(
        "flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto rounded-[2rem]",
        variant === "glass" && "glass shadow-glow-primary/10",
        variant === "subtle" && "bg-muted/30 border border-border/50",
        className
      )}
    >
      <div className="relative mb-8">
        <motion.div
          variants={iconVariants}
          className="h-20 w-20 rounded-2xl glass flex items-center justify-center relative z-10"
        >
          {Icon ? (
            <Icon className="h-10 w-10 text-primary animate-pulse-slow" aria-hidden="true" />
          ) : (
            <Sparkles className="h-10 w-10 text-primary animate-pulse-slow" aria-hidden="true" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 opacity-50 z-0" />
      </div>

      <h3 className="text-2xl font-black slant-heading tracking-tight mb-3 text-foreground">
        {title}
      </h3>
      <p className="text-muted-foreground/80 leading-relaxed mb-8 max-w-sm mx-auto">
        {description}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          size="lg"
          className="gap-2 rounded-full px-8 hover-scale active:scale-95 transition-all shadow-glow-primary/20"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

export function PremiumLoadingState({ message = "Gathering milk data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
        <motion.div
          className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary/50 animate-pulse" aria-hidden="true" />
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-sm font-medium slant-accent text-primary/60 tracking-[0.2em]"
      >
        {message}
      </motion.p>
    </div>
  )
}

export function PremiumEmptyState({
  title = "Nothing to show here",
  description = "We couldn't find any records matching your criteria.",
  action,
}: Partial<UIStateProps>) {
  return (
    <PremiumStateDisplay
      icon={Inbox}
      title={title}
      description={description}
      action={action}
      variant="glass"
    />
  )
}

export function PremiumErrorState({
  message = "A glitch occurred in the system.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <PremiumStateDisplay
      icon={AlertCircle}
      title="System Interrupted"
      description={message}
      action={onRetry ? { label: "Re-synchronize", onClick: onRetry, icon: Sparkles } : undefined}
      className="border-destructive/20 hover:border-destructive/40"
    />
  )
}
