"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    if (!mounted) return <div className="w-12 h-6 rounded-full glass opacity-20" />

    const isDark = theme === "dark"

    return (
        <div className="flex items-center gap-2 p-1 rounded-full glass border border-border/10 bg-background/50 backdrop-blur-md">
            <button
                onClick={() => setTheme("light")}
                className={cn(
                    "relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500",
                    !isDark ? "text-amber-500" : "text-foreground/40 hover:text-foreground"
                )}
            >
                {!isDark && (
                    <motion.div
                        layoutId="theme-active"
                        className="absolute inset-0 bg-background shadow-glow-amber/10 rounded-full border border-amber-500/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <Sun className="w-4 h-4 relative z-10" />
            </button>

            <button
                onClick={() => setTheme("dark")}
                className={cn(
                    "relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500",
                    isDark ? "text-primary" : "text-foreground/40 hover:text-foreground"
                )}
            >
                {isDark && (
                    <motion.div
                        layoutId="theme-active"
                        className="absolute inset-0 bg-foreground/10 shadow-glow-primary/10 rounded-full border border-primary/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <Moon className="w-4 h-4 relative z-10" />
            </button>
        </div>
    )
}
