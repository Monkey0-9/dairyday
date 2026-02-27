'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body className="bg-[#020205] text-slate-50 font-sans selection:bg-rose-500/20">
                <div className="min-h-[100dvh] flex items-center justify-center p-6 relative overflow-hidden">
                    {/* Atmospheric Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/20 to-transparent blur-xl" />

                    <div className="text-center max-w-md w-full glass-card p-10 rounded-[2.5rem] border border-white/10 relative z-10 shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in duration-700">
                        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse shadow-glow-rose/10">
                            <span className="text-4xl">⚠️</span>
                        </div>

                        <h1 className="text-3xl font-black italic tracking-tighter uppercase font-heading text-white mb-3">
                            Critical <span className="text-rose-500">Error</span>
                        </h1>

                        <p className="text-white/40 text-sm font-medium italic tracking-tight mb-8">
                            Kernel fault detected. The application encountered an unrecoverable state and must be re-initialized.
                        </p>

                        <button
                            onClick={reset}
                            className="w-full py-4 bg-primary text-white text-[11px] font-black tracking-widest uppercase rounded-2xl border border-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-glow-primary hover:shadow-glow-primary/40 group overflow-hidden relative"
                        >
                            <span className="relative z-10">Initialize Recovery</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </button>

                        {error.digest && (
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="text-[9px] font-black tracking-[0.2em] text-white/20 uppercase font-mono">
                                    Fault_ID: <span className="text-rose-500/40">{error.digest}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </body>
        </html>
    )
}
