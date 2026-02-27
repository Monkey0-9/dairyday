"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    highlight?: string
    subtitle?: string
    badge?: string
    badgeIcon?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}

export const PageHeader = ({
    title,
    highlight,
    subtitle,
    badge,
    badgeIcon,
    actions,
    className,
}: PageHeaderProps) => {
    return (
        <header className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10", className)}>
            <div className="space-y-3">
                {(badge || badgeIcon) && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 shadow-glow-primary/5"
                    >
                        {badgeIcon && <div className="text-primary">{badgeIcon}</div>}
                        {badge && (
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                                {badge}
                            </span>
                        )}
                    </motion.div>
                )}

                <div className="space-y-1">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase font-heading text-white leading-none"
                    >
                        {title} {highlight && <span className="text-gradient">{highlight}</span>}
                    </motion.h1>

                    {subtitle && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-white/40 text-sm font-heading font-medium italic tracking-tight"
                        >
                            {subtitle}
                        </motion.p>
                    )}
                </div>
            </div>

            {actions && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3"
                >
                    {actions}
                </motion.div>
            )}
        </header>
    )
}
