"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun, LogOut, LayoutGrid, Users, FileText, Droplet, Key, ShieldCheck } from "lucide-react"

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/consumption", label: "Consumption", icon: Droplet },
  { href: "/admin/bills", label: "Bills", icon: FileText },
  { href: "/admin/users", label: "Customers", icon: Users },
  { href: "/admin/audit-logs", label: "Audit Vault", icon: ShieldCheck },
  { href: "/admin/change-password", label: "Change Password", icon: Key },
]

const userLinks = [
  { href: "/user/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/user/change-password", label: "Change Password", icon: Key },
]

interface NavbarProps {
  role?: "admin" | "user"
}

export function Navbar({ role }: NavbarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  // Determine role based on prop or path
  const isAdmin = role === "admin" || pathname.startsWith("/admin")
  const links = isAdmin ? adminLinks : userLinks
  const isLoginPage = pathname === "/admin/login" || pathname === "/user/login"
  const hasToken = typeof window !== "undefined" ? !!localStorage.getItem("token") : false

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user_id")
    window.location.href = isAdmin ? "/admin/login" : "/user/login"
  }

  return (
    <header className="glass sticky top-0 z-50 w-full shadow-elev-2 transition-all duration-300">
      <div className="container flex h-16 items-center px-4 md:px-8">
        <div className="mr-4 hidden md:flex items-center">
          <Link href="/" className="mr-8 flex items-center space-x-2.5 group">
            <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Droplet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-black text-xl tracking-tight sm:inline-block text-gradient">
              DairyOS
            </span>
          </Link>
          {!isLoginPage && hasToken && (
            <nav className="flex items-center space-x-1.5 text-sm font-medium">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2.5 group/link",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "group-hover/link:text-foreground")} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {/* Mobile Logo */}
        <div className="flex md:hidden flex-1">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/10">
              <Droplet className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">DairyOS</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-3">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Space for global search or status */}
          </div>
          <nav className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-9 w-9 rounded-full hover:bg-background/80 transition-transform active:scale-95"
            >
              <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
            >
              <LogOut className="h-[1.1rem] w-[1.1rem]" />
              <span className="sr-only">Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
}
