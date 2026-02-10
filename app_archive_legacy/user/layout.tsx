"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Droplet, Moon, Sun, LogOut, LayoutGrid, Key } from "lucide-react"
import { cn } from "@/lib/utils"

const userLinks = [
  { href: "/user/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/user/change-password", label: "Change Password", icon: Key },
]

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("access_token")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_role")
    window.location.href = "/user/login"
  }

  // Skip layout for login page
  if (pathname === "/user/login") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/user/dashboard" className="flex items-center gap-2">
                <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center">
                  <Droplet className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">DairyOS</span>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {userLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto py-2 gap-1">
            {userLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}

