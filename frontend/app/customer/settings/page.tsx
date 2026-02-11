"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  Moon, 
  Mail, 
  Bell, 
  Lock, 
  Download, 
  LogOut, 
  ChevronRight, 
  Laptop, 
  Globe, 
  ShieldAlert, 
  Smartphone,
  HelpCircle,
  ExternalLink,
  Loader2,
  RefreshCw
} from "lucide-react"
import { motion } from "framer-motion"

import ChangePasswordModal from "@/components/modals/change-password-modal"
import ExportDataModal from "@/components/modals/export-data-modal"
import { authApi, usersApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from "@/context/language-context"
import { Language } from "@/lib/translations"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useTranslation()
  const queryClient = useQueryClient()
  
  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Fetch User Data
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await usersApi.getMe()
      return res.data
    }
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateMe(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['me'], updatedUser.data)
      toast.success("Settings updated", { id: "settings-update" })
    },
    onError: () => {
      toast.error("Failed to update settings", { id: "settings-update" })
    }
  })

  // Validated State (derived from user data or defaults)
  const preferences = user?.preferences || {}
  const darkMode = theme === 'dark' // Sync with system theme
  const emailAlerts = preferences.email_alerts ?? true
  const pushNotifications = preferences.push_notifications ?? true
  const twoFactorAuth = preferences.two_factor_auth ?? false

  // Handlers
  const handleToggle = (key: string, value: boolean) => {
    // Special handling for Theme
    if (key === 'dark_mode') {
        setTheme(value ? 'dark' : 'light')
        // We also save to backend, but theme is primarily client-side
    }
    
    // Save to backend
    updateMutation.mutate({
        preferences: {
            ...preferences,
            [key]: value
        }
    })
  }

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out from all devices?")) {
      authApi.logout()
      window.location.href = "/"
    }
  }

  const handleLanguageChange = () => {
      const langOrder: Language[] = ['en', 'kn', 'hi']
      const currentIndex = langOrder.indexOf(language)
      const nextLang = langOrder[(currentIndex + 1) % langOrder.length]
      setLanguage(nextLang)
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (isLoading) {
      return (
          <div className="min-h-screen p-6 max-w-lg mx-auto space-y-8 pt-20">
              <div className="space-y-2">
                <Skeleton className="h-8 w-40 bg-white/5" />
                <Skeleton className="h-4 w-60 bg-white/5" />
              </div>
              <Skeleton className="h-32 w-full rounded-3xl bg-white/5" />
              <div className="space-y-4">
                  <Skeleton className="h-4 w-24 bg-white/5" />
                  <Skeleton className="h-64 w-full rounded-3xl bg-white/5" />
              </div>
          </div>
      )
  }

  if (isError) {
      return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-white">
                <p className="text-red-400">Failed to load settings.</p>
                <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
            </div>
      )
  }

  return (
    <div className="min-h-screen text-foreground pb-24 font-sans transition-colors duration-500 relative overflow-hidden">
      
      {/* Premium Background Glows - subtle in both modes */}
      <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.03, 0.08, 0.03] 
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] dark:opacity-10 opacity-5" 
          />
          <motion.div 
            animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.02, 0.05, 0.02] 
            }}
            transition={{ duration: 12, repeat: Infinity, delay: 2 }}
            className="absolute top-1/2 -left-24 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] dark:opacity-10 opacity-5" 
          />
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-lg mx-auto px-5 pt-10 space-y-8 relative z-10"
      >
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">Settings</h1>
              <p className="text-sm text-neutral-500 mt-1 font-medium">Control your profile & app experience</p>
            </div>
            {updateMutation.isPending && (
                <div className="h-10 w-10 rounded-full bg-foreground/[0.03] border border-border flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
            )}
        </div>

        {/* Profile Section */}
        <motion.div variants={item}>
            <Card 
                className="border-border backdrop-blur-2xl p-6 overflow-hidden relative group rounded-3xl bg-card/60 dark:bg-card/40" 
                style={{ 
                    boxShadow: "0 20px 50px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 opacity-50" />
                <div className="flex items-center gap-5 relative z-10">
                    <motion.div 
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-2xl font-black shadow-xl shadow-indigo-500/20 text-white"
                    >
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </motion.div>
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">{user.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-black tracking-widest text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 uppercase">
                                {user.phone || 'ID-' + user.id.substring(0, 8)}
                            </span>
                            <span className="text-[10px] text-emerald-500 flex items-center gap-1.5 font-black bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-tighter">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Verified
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>

        {/* Preferences Hub */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <span className="w-1 h-3 bg-indigo-500 rounded-full" />
            <h3 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.25em]">{t('preferences')}</h3>
          </div>
          
          <Card 
            className="border-border backdrop-blur-2xl overflow-hidden divide-y divide-border/50 rounded-3xl bg-card/60 dark:bg-card/40" 
            style={{ 
                boxShadow: "0 20px 50px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
            }}
          >
            
            <div className="p-5 flex justify-between items-center hover:bg-foreground/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                    <Moon className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-foreground">{t('darkMode')}</span>
                    <span className="block text-[11px] text-neutral-500 font-medium">Auto appearance</span>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={(v) => handleToggle("dark_mode", v)} />
            </div>

            <div className="p-5 flex justify-between items-center hover:bg-foreground/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    <Mail className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-foreground">{t('emailAlerts')}</span>
                    <span className="block text-[11px] text-neutral-500 font-medium">Invoices & Summary</span>
                </div>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={(v) => handleToggle("email_alerts", v)} />
            </div>

            <div className="p-5 flex justify-between items-center hover:bg-foreground/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20 group-hover:bg-rose-500/20 transition-all">
                    <Bell className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-foreground">{t('pushNotifications')}</span>
                    <span className="block text-[11px] text-neutral-500 font-medium">Real-time delivery status</span>
                </div>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={(v) => handleToggle("push_notifications", v)} />
            </div>

             <div className="p-5 flex justify-between items-center hover:bg-foreground/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 group-hover:bg-amber-500/20 transition-all">
                    <Globe className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-foreground">{t('appLanguage')}</span>
                    <span className="block text-[11px] text-neutral-500 font-medium">Interface translation</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLanguageChange}
                className="text-[11px] font-black h-8 px-4 rounded-xl border border-border hover:bg-accent text-foreground uppercase tracking-wider"
              >
                {language === 'en' ? 'English' : language === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Security & Access */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <span className="w-1 h-3 bg-violet-500 rounded-full" />
            <h3 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.25em]">{t('security')}</h3>
          </div>
          
          <Card 
            className="border-border backdrop-blur-2xl overflow-hidden divide-y divide-border/50 rounded-3xl bg-card/60 dark:bg-card/40" 
            style={{ 
                boxShadow: "0 20px 50px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
            }}
          >
             <div className="p-5 flex justify-between items-center hover:bg-foreground/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                    <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-foreground">2-Factor Auth</span>
                    <span className="block text-[11px] text-neutral-500 font-medium">High-security login</span>
                </div>
              </div>
              <Switch checked={twoFactorAuth} onCheckedChange={(v) => handleToggle("two_factor_auth", v)} />
            </div>

            <button onClick={() => setShowPasswordModal(true)} className="w-full p-5 text-left hover:bg-foreground/[0.02] transition-colors flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/20 group-hover:bg-violet-500/20 transition-all">
                    <Lock className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-foreground">{t('updatePassword')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-foreground transform group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => setShowExportModal(true)} className="w-full p-5 text-left hover:bg-foreground/[0.02] transition-colors flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 ring-1 ring-cyan-500/20 group-hover:bg-cyan-500/20 transition-all">
                    <Download className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-foreground">{t('exportData')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-foreground transform group-hover:translate-x-1 transition-all" />
            </button>
            
            <div className="p-5 flex justify-between items-center cursor-default">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-foreground/[0.03] text-neutral-400 border border-border">
                    <Laptop className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-foreground">Current Session</span>
                    <span className="block text-[10px] text-neutral-500 font-mono uppercase tracking-tighter mt-0.5">
                        {typeof navigator !== 'undefined' ? navigator.platform : 'DB-PRO'} • MAC / CHROME
                    </span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-500 font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-[0.1em]">Active Now</span>
            </div>
          </Card>
        </motion.div>

        {/* Support & Logout Section */}
        <motion.div variants={item} className="space-y-6 pt-4">
             <div className="grid grid-cols-1 gap-4">
                <a 
                    href="https://wa.me/919980592787" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-between p-5 rounded-3xl border border-border hover:border-lime-500/30 transition-all group bg-card/60 dark:bg-card/40 backdrop-blur-xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-lime-500/10 text-lime-500 group-hover:scale-110 transition-transform">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block text-base font-black text-foreground">{t('help')}</span>
                            <span className="block text-xs font-bold text-neutral-500 uppercase tracking-tight">{t('connectWhatsapp')}</span>
                        </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-neutral-500 group-hover:text-lime-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </a>

                <button 
                    onClick={handleLogout} 
                    className="flex items-center justify-center gap-3 p-5 rounded-3xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all group"
                >
                    <LogOut className="w-5 h-5 text-rose-500 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-black text-rose-500 uppercase tracking-widest">{t('terminateSession')}</span>
                </button>
             </div>

             <div className="text-center space-y-4 pt-4 pb-12">
                <div className="flex items-center justify-center gap-3 opacity-30">
                    <div className="h-[1px] w-8 bg-foreground" />
                    <p className="text-[10px] text-foreground font-black uppercase tracking-[0.4em]">DairyDay Premium</p>

                    <div className="h-[1px] w-8 bg-foreground" />
                </div>
                <div className="flex justify-center gap-8">
                    <button className="text-[11px] font-black text-neutral-500 hover:text-foreground transition-colors uppercase tracking-[0.2em]">Terms</button>
                    <button className="text-[11px] font-black text-neutral-500 hover:text-foreground transition-colors uppercase tracking-[0.2em]">Privacy</button>
                    <button className="text-[11px] font-black text-neutral-500 hover:text-foreground transition-colors uppercase tracking-[0.2em]">Legal</button>
                </div>
             </div>
        </motion.div>
      </motion.div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <ExportDataModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  )
}
