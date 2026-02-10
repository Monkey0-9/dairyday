"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error)
    console.error("Component stack:", errorInfo.componentStack)
    
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. This might be a temporary issue, so please try again.
            </p>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left mb-6 p-4 bg-muted rounded-lg text-sm">
                <summary className="font-semibold cursor-pointer">Error Details</summary>
                <pre className="mt-2 overflow-auto text-xs">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 overflow-auto text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            
            <div className="flex gap-4 justify-center">
              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook-based error boundary wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Page-level error page (for use in app/error.tsx)
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Application Error</h2>
        <p className="text-muted-foreground mb-6">
          We apologize for the inconvenience. A critical error has occurred.
        </p>
        
        <Button onClick={reset} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

