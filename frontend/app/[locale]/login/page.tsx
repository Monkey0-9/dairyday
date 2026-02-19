"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
import { toast } from "sonner"
import { authApi } from "@/lib/api"
import { useTranslations } from "next-intl"

export default function LoginPage() {
  const t = useTranslations('Auth')
  const tLanding = useTranslations('Landing')

  const loginSchema = z.object({
    username: z.string().min(1, t('identifierRequired')),
    password: z.string().min(8, t('passwordTooShort')),
  })
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
      const response = await authApi.login(values)
      const { access_token, refresh_token, user } = response.data

      authApi.setTokens(access_token, refresh_token)
      authApi.setUserData(user?.id, user?.role)
      toast.success(t('securityClearanceGranted'))

      if (user?.role?.toLowerCase() === "admin") {
        router.push("/admin/daily-entry")
      } else {
        router.push("/customer/dashboard")
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      console.error("Login Error:", error, err.response);
      toast.error(err.response?.data?.detail || err.message || t('criticalAuthFailure'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden selection:bg-primary/30">
      {/* atmospheric lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[200px] animate-pulse-glow opacity-30" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[200px] animate-pulse-glow opacity-20" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] p-6 relative z-10"
      >
        <div className="p-10 md:p-14 rounded-[3.5rem] glass-card relative overflow-hidden group">
          {/* Top Scanline */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-shimmer-sweep" />

          <div className="flex flex-col items-center">
            <motion.div
              initial={{ rotate: -15, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 bg-primary/20 blur-[50px] animate-pulse" />
              <div className="relative p-5 rounded-2xl bg-primary shadow-glow-primary">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            <div className="text-center mb-10">
              <h1 className="text-4xl font-black tracking-tighter text-white font-heading italic uppercase leading-none mb-3">
                {tLanding('nav.authorize')}
              </h1>
              <span className="font-micro text-primary/60 tracking-[0.5em]">
                DAIRY_GATEWAY_v2.x
              </span>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-8">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="font-micro ml-1">{t('identifierKey')}</FormLabel>
                      <FormControl>
                        <div className="relative group/input">
                          <Input
                            placeholder={t('operatorCodePlaceholder')}
                            className="h-14 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-6 text-white font-bold tracking-tight text-base"
                            {...field}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-700" />
                        </div>
                      </FormControl>
                      <FormMessage className="font-micro text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="font-micro ml-1">{t('securityAuth')}</FormLabel>
                      <FormControl>
                        <div className="relative group/input">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-14 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-6 pr-12 text-white font-bold tracking-tight text-base"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors p-2"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-700" />
                        </div>
                      </FormControl>
                      <FormMessage className="font-micro text-destructive" />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-3.5 h-3.5 rounded border border-white/10 group-hover:border-primary transition-colors bg-white/[0.02]" />
                    <span className="font-micro opacity-40 group-hover:opacity-100">{t('stayPersistent')}</span>
                  </div>
                  <Link href="/forgot-password" className="font-micro text-primary/60 hover:text-primary transition-colors italic">
                    {t('forgotPassword')}
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-16 rounded-2xl bg-white text-black hover:bg-primary hover:text-white text-lg font-heading font-black italic tracking-tight transition-all duration-700 group relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-center gap-3"
                      >
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('verifying').toUpperCase()}</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-center gap-3"
                      >
                        <span>{t('initializeData').toUpperCase()}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </form>
            </Form>


          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/[0.01] backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-primary opacity-50" />
            <span className="font-micro text-[8px] tracking-[0.4em] opacity-30">{t('encryptedAuthBridge')}</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/5 to-transparent" />
        </motion.div>
      </motion.div>

      {/* Cyber Diagnostics Footer */}
      <div className="absolute bottom-8 left-0 right-0 px-10 flex justify-between items-center pointer-events-none opacity-20">
        <div className="flex gap-12">
          <div className="flex flex-col">
            <span className="font-micro text-[8px] mb-1">{t('regionLabel')}</span>
            <span className="font-heading font-black italic text-lg tracking-tighter">IN-WEST-1</span>
          </div>
          <div className="flex flex-col">
            <span className="font-micro text-[8px] mb-1">{t('encryptionLabel')}</span>
            <span className="font-heading font-black italic text-lg tracking-tighter">ECDSA_384</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-micro text-[8px] mb-1">{t('systemUptime')}</span>
          <span className="font-heading font-black italic text-lg tracking-tighter">99.999%</span>
        </div>
      </div>
    </div>
  )
}
