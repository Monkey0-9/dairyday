"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideProps, Table, FileText, Users, AlertCircle, Loader2 } from "lucide-react"
import { ForwardRefExoticComponent, RefAttributes } from "react"

type IconComponent = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>

export interface EmptyStateProps {
  icon: IconComponent
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline" className="gap-2">
          <Icon className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Specialized empty states for common use cases
interface GridStateProps {
  onImport?: () => void
  onAdd?: () => void
}

export function EmptyGridState({ onImport, onAdd }: GridStateProps) {
  const hasAction = !!(onImport || onAdd)
  const handleClick = () => {
    if (onImport) onImport()
    else if (onAdd) onAdd()
  }
  
  return (
    <EmptyState
      icon={Table}
      title="No data available"
      description="Get started by importing data or adding entries manually."
      action={hasAction ? { label: onImport ? "Import CSV" : "Add Entry", onClick: handleClick } : undefined}
    />
  )
}

interface BillStateProps {
  onGenerate?: () => void
}

export function EmptyBillState({ onGenerate }: BillStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No bills found"
      description="Generate bills for this month to see them here."
      action={onGenerate ? { label: "Generate Bills", onClick: onGenerate } : undefined}
    />
  )
}

interface UserStateProps {
  onAdd?: () => void
}

export function EmptyUserState({ onAdd }: UserStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      description="Add customers to get started with your dairyday management."
      action={onAdd ? { label: "Add Customer", onClick: onAdd } : undefined}
    />
  )
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-muted" />
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground mt-4">{message}</p>
    </div>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || "An error occurred while loading data. Please try again."}
      action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
    />
  )
}

