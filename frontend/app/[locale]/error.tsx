'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[DairyDay Error]', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="p-8 rounded-3xl border border-danger/20 bg-obsidian-800/60 backdrop-blur-2xl max-w-md text-center space-y-4 shadow-glass-elev">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-danger" />
                </div>
                <h2 className="font-heading text-xl font-bold">Something went wrong</h2>
                <p className="text-foreground/50 text-sm">
                    An unexpected error occurred. Your data is safe.
                </p>
                <Button onClick={reset} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </Button>
                {error.digest && (
                    <p className="text-foreground/20 text-xs font-mono">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
        </div>
    )
}
