"use client"

import { useState, useEffect, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Save, User, MapPin, Phone, Globe, Palette, Fingerprint } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { useRouter, usePathname } from '@/i18n/routing'
import { useTheme } from "next-themes"
import { useFontSize } from "@/components/font-size-provider"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { usersApi } from "@/lib/api"
import { formatApiError } from "@/lib/utils"

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    language: z.string().optional(),
    theme: z.string().optional(),
    font_size: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function AdminProfilePage() {
    const t = useTranslations("Profile")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { setTheme } = useTheme()
    const { setFontSize } = useFontSize()
    const [, startTransition] = useTransition()

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            phone: "",
            email: "",
            address: "",
            language: "en",
            theme: "dark",
            font_size: "medium",
        },
    })

    useEffect(() => {
        async function fetchProfile() {
            try {
                const { data } = await usersApi.getMe()
                form.reset({
                    name: data.name,
                    phone: data.phone || "",
                    email: data.email || "",
                    address: data.address || "",
                    language: data.language || "en",
                    theme: data.theme || "dark",
                    font_size: data.font_size || "medium",
                })
                if (data.theme) setTheme(data.theme)
                if (data.font_size) setFontSize(data.font_size as "small" | "medium" | "large")
            } catch {
                toast.error("Failed to load profile data")
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfile()
    }, [form, setTheme, setFontSize])

    async function onSubmit(values: ProfileFormValues) {
        setIsSaving(true)
        try {
            await usersApi.updateMe(values)
            toast.success(t("profileUpdated") || "PROFILE_SYNC_SUCCESS")
            if (values.theme) setTheme(values.theme)
            if (values.font_size) setFontSize(values.font_size as "small" | "medium" | "large")
            if (values.language) {
                startTransition(() => {
                    router.replace(pathname, { locale: values.language })
                })
            }
        } catch (err) {
            toast.error(formatApiError(err))
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-6 space-y-6 text-foreground">
            {/* Header Profile Protocol */}
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-border/10 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary shadow-glow-primary animate-pulse" />
                        <span className="font-micro text-[10px] text-primary tracking-[0.4em] uppercase">{t('adminVault')}</span>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-black font-heading italic uppercase tracking-tighter leading-none">{t('title').split(' ')[0]} <span className="text-gradient">{t('title').split(' ').slice(1).join(' ')}</span></h1>
                </div>

                <div className="flex items-center gap-4 px-4 py-2 bg-foreground/[0.02] border border-border/10 rounded-xl glass-card">
                    <Fingerprint className="text-primary" size={16} />
                    <span className="font-micro text-[9px] text-foreground/40 tracking-widest uppercase italic leading-none">{t('clearanceGranted')}</span>
                </div>
            </header>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Identity Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-6 rounded-2xl glass-card border-border/5 bg-foreground/[0.02] space-y-6"
                        >
                            <div className="flex items-center gap-4 pb-4 border-b border-border/5">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow-primary/5">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-heading font-black italic uppercase tracking-tight text-foreground">{t('personalInfo')}</h3>
                                    <p className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.2em]">{t('personalInfoDesc')}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('fullName')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} className="h-10 bg-foreground/[0.02] border-border/5 rounded-xl px-4 text-sm font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('phone')}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/10 group-focus-within:text-primary transition-colors" />
                                                    <Input className="pl-11 h-10 bg-foreground/[0.02] border-border/5 rounded-xl text-sm font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" placeholder="+91 00000 00000" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('address')}</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/10 group-focus-within:text-primary transition-colors" />
                                                    <Input className="pl-11 h-10 bg-foreground/[0.02] border-border/5 rounded-xl text-sm font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" placeholder="Enter physical location node..." {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </motion.div>

                        {/* Matrix Preferences */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-6 rounded-2xl glass-card border-border/5 bg-foreground/[0.02] space-y-6"
                        >
                            <div className="flex items-center gap-4 pb-4 border-b border-border/5">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-glow-emerald/5">
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-heading font-black italic uppercase tracking-tight text-foreground">{t('preferences')}</h3>
                                    <p className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.2em]">{t('preferencesDesc')}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="language"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('language')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 bg-foreground/[0.02] border-border/5 rounded-xl px-4 text-sm font-heading font-bold italic text-foreground focus:ring-0 focus:border-primary/40 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="h-4 w-4 text-primary" />
                                                            <SelectValue placeholder={t('localeNode')} />
                                                        </div>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-background dark:bg-black border-border/10 rounded-xl glass-card text-foreground">
                                                    <SelectItem value="en">English (Elite_v1)</SelectItem>
                                                    <SelectItem value="kn">Kannada (ಕನ್ನಡ)</SelectItem>
                                                    <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                                                    <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                                                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                                                    <SelectItem value="ml">Malayalam (മലയാളം)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="theme"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.3em] ml-2">Visual_Theme</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 bg-foreground/[0.02] border-border/5 rounded-xl px-4 text-sm font-heading font-bold italic text-foreground focus:ring-0 focus:border-primary/40 transition-all">
                                                            <SelectValue placeholder={t('atmos')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-background dark:bg-black border-border/10 rounded-xl glass-card text-foreground">
                                                        <SelectItem value="light">{t('themeLight')}</SelectItem>
                                                        <SelectItem value="dark">{t('themeDark')}</SelectItem>
                                                        <SelectItem value="system">{t('themeSystem')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="font_size"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="font-micro text-[8px] text-foreground/20 uppercase tracking-[0.3em] ml-2">Typography</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 bg-foreground/[0.02] border-border/5 rounded-xl px-4 text-sm font-heading font-bold italic text-foreground focus:ring-0 focus:border-primary/40 transition-all">
                                                            <SelectValue placeholder={t('scale')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-background dark:bg-black border-border/10 rounded-xl glass-card text-foreground">
                                                        <SelectItem value="small">{t('sizeSmall')}</SelectItem>
                                                        <SelectItem value="medium">{t('sizeMedium')}</SelectItem>
                                                        <SelectItem value="large">{t('sizeLarge')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <User className="text-primary" size={14} />
                                        <h4 className="font-heading font-black italic uppercase tracking-tight text-foreground/60 text-xs">{t('operatorClearance')}</h4>
                                    </div>
                                    <p className="font-micro text-[9px] text-foreground/20 tracking-widest leading-normal">
                                        Your account holds administrative privileges. All configuration changes are audited and logged to the central ledger.
                                    </p>
                                </div>
                                
                                {/* Premium Support Banner */}
                                <div className="pt-2">
                                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-primary/5 border border-primary/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                                    <h4 className="font-heading font-black italic uppercase tracking-tight text-white mb-3 flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                      Priority Elite Support
                                    </h4>
                                    <div className="space-y-3 relative z-10">
                                      <div className="flex items-center gap-3 text-white/80">
                                         <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                           <Phone size={14} className="text-primary" />
                                         </div>
                                         <span className="font-mono text-sm tracking-widest">+91 99805 92787</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-white/80">
                                         <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                           <Globe size={14} className="text-blue-400" />
                                         </div>
                                         <span className="font-mono text-[11px] tracking-wider break-all">dairydaysdairydays@gmail.com</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Action Control Rail */}
                    <footer className="flex flex-col md:flex-row justify-end items-center gap-4 pt-8 border-t border-border/10">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.back()}
                            disabled={isSaving}
                            className="h-10 px-8 rounded-xl font-micro text-foreground/20 hover:text-foreground uppercase tracking-widest transition-all text-[10px]"
                        >
                            {t('abortChanges')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="h-12 px-10 rounded-xl bg-foreground text-background hover:bg-primary hover:text-white font-heading font-black tracking-tight italic text-lg gap-3 transition-all duration-700 shadow-2xl group"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {t('syncingNode')}
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="group-hover:scale-125 transition-transform" />
                                    {t('saveProtocol')}
                                </>
                            )}
                        </Button>
                    </footer>
                </form>
            </Form>
        </div>
    )
}
