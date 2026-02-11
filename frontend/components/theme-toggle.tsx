"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full hover:bg-white/10 w-10 h-10 transition-colors"
      suppressHydrationWarning
    >
      <div className="relative w-5 h-5">
         <Sun className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${mounted && theme === 'dark' ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
         <Moon className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${mounted && theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
