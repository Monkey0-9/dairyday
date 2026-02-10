"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Droplet, Moon, Sun, LogOut, LayoutGrid, FileText, Users, Settings, Key, Menu, X, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

const adminLinks = [
  { href: "/admin/daily-entry", label: "Daily Entry", icon: Droplet },
  { href: "/admin/consumption", label: "Consumption", icon: LayoutGrid },
  { href: "/admin/bills", label: "Bills", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: Settings },
  { href: "/admin/users", label: "Customers", icon: Users },
  { href: "/admin/dashboard", label: "Dashboard", icon: Activity },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("access_token")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_role")
    window.location.href = "/admin/login"
  }

  // Skip layout for login page
  if (pathname === "/admin/login") {
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
              <Link href="/admin/daily-entry" className="flex items-center gap-2">
                <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center">
                  <Droplet className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">DairyOS</span>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {adminLinks.map((link) => {
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
                className="hidden md:flex"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-2 h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2">
            {adminLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              )
            })}
            <div className="border-t my-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start px-3 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto py-2 gap-1">
            {adminLinks.map((link) => {
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

