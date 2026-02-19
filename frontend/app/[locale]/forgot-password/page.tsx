"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    Loader2,
    ShieldCheck,
    Mail,
    Lock,
    ChevronLeft,
    CheckCircle2,
    KeyRound
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { toast } from "sonner"


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
import { authApi } from "@/lib/api"



export default function ForgotPasswordPage() {
    const t = useTranslations('Auth')

    const identifierSchema = z.object({
        identifier: z.string().min(3, t('identifierRequired')),
    })

    const resetSchema = z.object({
        otp_code: z.string().length(6, t('otpMustBe6Digits')),
        new_password: z.string().min(8, t('passwordTooShort')),
        confirmPassword: z.string().min(8, t('passwordTooShort')),
    }).refine((data) => data.new_password === data.confirmPassword, {
        message: t('passwordsDoNotMatch'),
        path: ["confirmPassword"],
    })
    const tCommon = useTranslations('Common')
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [step, setStep] = useState<'identify' | 'reset'>('identify')
    const [identifier, setIdentifier] = useState("")

    const idForm = useForm<z.infer<typeof identifierSchema>>({
        resolver: zodResolver(identifierSchema),
        defaultValues: {
            identifier: "",
        },
    })

    const resetForm = useForm<z.infer<typeof resetSchema>>({
        resolver: zodResolver(resetSchema),
        defaultValues: {
            otp_code: "",
            new_password: "",
            confirmPassword: "",
        },
    })

    async function onIdentify(values: z.infer<typeof identifierSchema>) {
        setIsLoading(true)
        try {
            await authApi.forgotPassword(values.identifier)
            setIdentifier(values.identifier)
            setStep('reset')
            toast.success(t('otpSuccess'))
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || t('failedToSendOtp'))
        } finally {
            setIsLoading(false)
        }
    }

    async function onReset(values: z.infer<typeof resetSchema>) {
        setIsLoading(true)
        try {
            await authApi.resetPassword({
                identifier,
                otp_code: values.otp_code,
                new_password: values.new_password
            })
            setIsSuccess(true)
            toast.success(t('resetSuccess'))
            setTimeout(() => {
                router.push("/")
            }, 3000)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || t('passwordResetFailed'))
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden selection:bg-primary/30">
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse-glow opacity-30" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    className="w-full max-w-[540px] p-6 relative z-10 text-center"
                >
                    <div className="p-10 md:p-14 rounded-[3.5rem] glass-card overflow-hidden">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 12 }}
                            className="mb-8 flex justify-center"
                        >
                            <div className="p-6 rounded-3xl bg-emerald-500 shadow-glow-emerald">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                        </motion.div>
                        <h1 className="text-4xl font-black tracking-tighter text-white font-heading italic uppercase leading-none mb-6">
                            {t('resetSuccess')}
                        </h1>
                        <p className="text-white/60 mb-10 leading-relaxed font-medium">
                            {t('redirectingToLogin')}
                        </p>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden selection:bg-primary/30 py-20">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[200px] animate-pulse-glow opacity-30" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[200px] animate-pulse-glow opacity-20" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[540px] p-6 relative z-10"
            >
                <div className="p-10 md:p-14 rounded-[3.5rem] glass-card relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-shimmer-sweep" />

                    <div className="flex flex-col items-center">
                        <AnimatePresence mode="wait">
                            {step === 'identify' ? (
                                <motion.div
                                    key="identify"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="w-full"
                                >
                                    <div className="text-center mb-10">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                            <KeyRound className="w-8 h-8 text-primary" />
                                        </div>
                                        <h1 className="text-4xl font-black tracking-tighter text-white font-heading italic uppercase leading-none mb-3">
                                            {t('forgotPasswordTitle')}
                                        </h1>
                                        <p className="text-white/40 text-sm italic font-medium">
                                            {t('forgotPasswordDesc')}
                                        </p>
                                    </div>

                                    <Form {...idForm}>
                                        <form onSubmit={idForm.handleSubmit(onIdentify)} className="w-full space-y-6">
                                            <FormField
                                                control={idForm.control}
                                                name="identifier"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-4">
                                                        <FormLabel className="font-micro ml-1 flex items-center gap-2"><Mail className="w-3 h-3" /> {t('identifierKey').toUpperCase()}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t('placeholder')}
                                                                className="h-16 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-2xl transition-all duration-500 pl-6 text-white font-bold"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="font-micro text-destructive" />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full h-16 rounded-2xl bg-white text-black hover:bg-primary hover:text-white text-lg font-heading font-black italic tracking-tight transition-all duration-700 group mt-4 overflow-hidden"
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t('sendOtp').toUpperCase()}</span>}
                                            </Button>

                                            <button
                                                type="button"
                                                onClick={() => router.push("/")}
                                                className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-primary transition-colors font-micro mb-4"
                                            >
                                                <ChevronLeft className="w-3 h-3" /> {tCommon('back').toUpperCase()}
                                            </button>
                                        </form>
                                    </Form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="reset"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="w-full"
                                >
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                            <ShieldCheck className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                                            {t('resetPasswordTitle')}
                                        </h2>
                                        <p className="text-white/40 text-sm font-medium leading-relaxed">
                                            {t('resetPasswordDesc')}
                                        </p>
                                    </div>

                                    <Form {...resetForm}>
                                        <form onSubmit={resetForm.handleSubmit(onReset)} className="w-full space-y-6">
                                            <FormField
                                                control={resetForm.control}
                                                name="otp_code"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="font-micro ml-1 flex items-center gap-2">{t('securityAuth').toUpperCase()}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t('otpPlaceholder')}
                                                                maxLength={6}
                                                                className="h-16 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-2xl transition-all duration-500 text-center text-3xl font-black tracking-[0.5em] text-white"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-center font-micro text-destructive" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={resetForm.control}
                                                name="new_password"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="font-micro ml-1 flex items-center gap-2"><Lock className="w-3 h-3" /> {t('newPassword').toUpperCase()}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="password"
                                                                placeholder="••••••••"
                                                                className="h-16 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-2xl transition-all duration-500 pl-6 text-white font-bold"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="font-micro text-destructive" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={resetForm.control}
                                                name="confirmPassword"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="font-micro ml-1 flex items-center gap-2"><Lock className="w-3 h-3" /> {t('confirmPassword').toUpperCase()}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="password"
                                                                placeholder="••••••••"
                                                                className="h-16 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-2xl transition-all duration-500 pl-6 text-white font-bold"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="font-micro text-destructive" />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full h-16 rounded-2xl bg-primary text-white hover:bg-white hover:text-black text-lg font-heading font-black italic tracking-tight transition-all duration-700 mt-4 shadow-glow-primary"
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t('resetButton').toUpperCase()}</span>}
                                            </Button>

                                            <button
                                                type="button"
                                                onClick={() => setStep('identify')}
                                                className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-primary transition-colors font-micro mb-4"
                                            >
                                                <ChevronLeft className="w-3 h-3" /> {t('backToStep1').toUpperCase()}
                                            </button>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
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
