"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import {
    LogOut,
    User,
    Settings,
    ChevronDown
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { authApi, usersApi } from "@/lib/api"
import { ThemeToggle } from "./theme-toggle"

export function UserMenu() {
    const t = useTranslations("Common")
    const [user, setUser] = React.useState<{ name: string; email: string; role: string } | null>(null)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        usersApi.getMe().then(res => {
            setUser(res.data)
        }).catch(err => {
            console.error("Failed to fetch user data", err)
        })
    }, [])

    const handleLogout = () => {
        authApi.logout()
        window.location.href = "/"
    }

    if (!mounted || !user) return <div className="w-10 h-10 rounded-xl bg-foreground/5 animate-pulse" />

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()

    const profilePath = user.role.toLowerCase() === 'admin' ? '/admin/profile' : '/customer/profile'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 flex items-center gap-3 px-3 rounded-2xl border border-border/10 bg-foreground/5 hover:bg-foreground/10 transition-all duration-300 group">
                    <Avatar className="h-8 w-8 rounded-lg border border-border/10">
                        <AvatarImage src="" alt={user.name} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[0.625rem] font-black">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start text-left">
                        <span className="text-[0.625rem] font-black text-foreground/90 uppercase tracking-tight leading-none">{user.name}</span>
                        <span className="text-[0.5rem] font-micro text-foreground/30 uppercase tracking-[0.2em] mt-1">{user.role}</span>
                    </div>
                    <ChevronDown size={14} className="text-foreground/20 group-hover:text-foreground/60 transition-colors" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 border-border/10 bg-background/95 backdrop-blur-3xl rounded-2xl glass-card" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1 p-2">
                        <p className="text-xs font-black text-foreground uppercase tracking-tighter">{user.name}</p>
                        <p className="text-[0.625rem] text-foreground/40 truncate font-mono">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/10" />
                <DropdownMenuGroup className="p-1">
                    <DropdownMenuItem asChild className="flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 cursor-pointer group transition-all duration-300">
                        <Link href={profilePath} className="flex items-center gap-3 w-full">
                            <User size={16} className="text-foreground/40 group-hover:text-primary" />
                            <span className="text-xs font-black italic uppercase tracking-tight text-foreground/60 group-hover:text-foreground">{t('profile')}</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 cursor-pointer group transition-all duration-300">
                        <Link href={profilePath} className="flex items-center gap-3 w-full">
                            <Settings size={16} className="text-foreground/40 group-hover:text-primary" />
                            <span className="text-xs font-black italic uppercase tracking-tight text-foreground/60 group-hover:text-foreground">{t('settings')}</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border/10" />
                <div className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[0.625rem] font-black text-foreground/20 uppercase tracking-[0.2em]">{t('theme')}</span>
                        <ThemeToggle />
                    </div>
                </div>
                <DropdownMenuSeparator className="bg-border/10" />
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 focus:bg-rose-500/10 cursor-pointer group transition-all duration-300"
                >
                    <LogOut size={16} className="text-rose-500/60 group-hover:text-rose-500" />
                    <span className="text-xs font-black italic uppercase tracking-tight text-rose-500/60 group-hover:text-rose-500">{t('signOut')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
