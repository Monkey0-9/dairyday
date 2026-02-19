"use client"

import { useState, useEffect, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Save, User, MapPin, Phone, Globe, Palette, ShieldCheck, Fingerprint } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { useRouter, usePathname } from "@/i18n/routing"
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
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  email: z.string().email().optional(),
  address: z.string().optional(),
  language: z.string().optional(),
  theme: z.string().optional(),
  font_size: z.string().optional(),
  subscription_plan: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
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
      subscription_plan: "standard",
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
          subscription_plan: data.subscription_plan || "standard",
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
    <div className="container max-w-5xl py-12 space-y-16 text-foreground">
      {/* Header Profile Protocol */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 border-b border-border/10 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary animate-pulse" />
            <span className="font-micro text-primary tracking-[0.6em] uppercase">IDENTITY_VAULT_v4.2</span>
          </div>
          <h1 className="font-big text-foreground italic uppercase">Security <span className="text-gradient">Registry</span></h1>
        </div>

        <div className="flex items-center gap-6 px-8 py-4 bg-foreground/[0.02] border border-border/10 rounded-[2rem] glass-card">
          <Fingerprint className="text-primary" size={24} />
          <span className="font-micro text-foreground/40 tracking-widest uppercase italic">AUTH_STATE: NOMINAL</span>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Identity Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-10 rounded-[2.5rem] glass-card border-border/5 bg-foreground/[0.02] space-y-10"
            >
              <div className="flex items-center gap-6 pb-6 border-b border-border/5">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow-primary/5">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-black italic uppercase tracking-tight text-foreground">{t('personalInfo')}</h3>
                  <p className="font-micro text-foreground/20 uppercase tracking-[0.2em]">{t('personalInfoDesc')}</p>
                </div>
              </div>

              <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-micro text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('fullName')}</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-micro text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('phone')}</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                          <Input className="pl-16 h-16 bg-foreground/[0.02] border-border/5 rounded-2xl text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" placeholder="+91 00000 00000" {...field} />
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
                    <FormItem className="space-y-3">
                      <FormLabel className="font-micro text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('address')}</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <MapPin className="absolute left-6 top-6 h-5 w-5 text-foreground/10 group-focus-within:text-primary transition-colors" />
                          <Input className="pl-16 h-16 bg-foreground/[0.02] border-border/5 rounded-2xl text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" placeholder="Enter physical location node..." {...field} />
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
              className="p-10 rounded-[2.5rem] glass-card border-border/5 bg-foreground/[0.02] space-y-10"
            >
              <div className="flex items-center gap-6 pb-6 border-b border-border/5">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-glow-emerald/5">
                  <Palette size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-black italic uppercase tracking-tight text-foreground">{t('preferences')}</h3>
                  <p className="font-micro text-foreground/20 uppercase tracking-[0.2em]">{t('preferencesDesc')}</p>
                </div>
              </div>

              <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-micro text-foreground/20 uppercase tracking-[0.3em] ml-2">{t('language')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:ring-0 focus:border-primary/40 transition-all">
                            <div className="flex items-center gap-3">
                              <Globe className="h-5 w-5 text-primary" />
                              <SelectValue placeholder="LOCALE_NODE" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background dark:bg-black border-border/10 rounded-2xl glass-card text-foreground">
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

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="font-micro text-foreground/20 uppercase tracking-[0.3em] ml-2">Visual_Theme</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:ring-0 focus:border-primary/40 transition-all">
                              <SelectValue placeholder="ATMOS" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background dark:bg-black border-border/10 rounded-2xl glass-card text-foreground">
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
                      <FormItem className="space-y-3">
                        <FormLabel className="font-micro text-foreground/20 uppercase tracking-[0.3em] ml-2">Typography</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:ring-0 focus:border-primary/40 transition-all">
                              <SelectValue placeholder="SCALE" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background dark:bg-black border-border/10 rounded-2xl glass-card text-foreground">
                            <SelectItem value="small">{t('sizeSmall')}</SelectItem>
                            <SelectItem value="medium">{t('sizeMedium')}</SelectItem>
                            <SelectItem value="large">{t('sizeLarge')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 space-y-4">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="text-primary" size={20} />
                    <h4 className="font-heading font-black italic uppercase tracking-tight text-foreground/60">Subscription_Standard</h4>
                  </div>
                  <p className="font-micro text-[0.625rem] text-foreground/20 tracking-widest leading-loose">
                    Your account is currently synchronized with Standard Tier protocols. Premium benefits pending activation.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Action Control Rail */}
          <footer className="flex flex-col md:flex-row justify-end items-center gap-8 pt-12 border-t border-border/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSaving}
              className="h-16 px-12 rounded-2xl font-micro text-foreground/20 hover:text-foreground uppercase tracking-widest transition-all"
            >
              ABORT_CHANGES
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-20 px-16 rounded-[2rem] bg-foreground text-background hover:bg-primary hover:text-white font-heading font-black tracking-tighter italic text-2xl gap-6 transition-all duration-700 shadow-2xl group"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin" />
                  SYNCING_NODE...
                </>
              ) : (
                <>
                  <Save size={24} className="group-hover:scale-125 transition-transform" />
                  SAVE_PROTOCOL
                </>
              )}
            </Button>
          </footer>
        </form>
      </Form>
    </div>
  )
}
