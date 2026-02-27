"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    Eye,
    EyeOff,
    Loader2,
    ShieldCheck,
    User,
    Phone,
    MapPin,
    Lock,
    ChevronLeft,
    CheckCircle2
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
import { registrationApi } from "@/lib/api"
import axios from "axios"



export default function SignupPage() {
    const t = useTranslations('Signup')
    const tAuth = useTranslations('Auth')

    const signupSchema = z.object({
        name: z.string().min(2, t('valNameRequired')),
        phone: z.string().min(10, t('valPhoneRequired')),
        daily_target_qty: z.preprocess((val) => parseFloat(val as string), z.number().min(0.1, t('valDailyQuantityRequired'))),
        address: z.string().min(5, t('valAddressRequired')),
        password: z.string().min(8, t('valPasswordRequired')),
        confirmPassword: z.string().min(8, t('valPasswordRequired')),
    }).refine((data) => data.password === data.confirmPassword, {
        message: t('valPasswordMatch'),
        path: ["confirmPassword"],
    })

    const otpSchema = z.object({
        otp_code: z.string().length(6, t('valOtpRequired')),
    })

    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [step, setStep] = useState<'details' | 'verify'>('details')
    const [emailForVerification, setEmailForVerification] = useState("")
    const [resendCooldown, setResendCooldown] = useState(0)
    const [isResending, setIsResending] = useState(false)

    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: "",
            phone: "",
            daily_target_qty: 1.0,
            address: "",
            password: "",
            confirmPassword: "",
        },
    })

    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            otp_code: "",
        },
    })

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    async function onSubmit(values: z.infer<typeof signupSchema>) {
        setIsLoading(true)
        try {
            await registrationApi.signup(values)
            setEmailForVerification(values.phone) // Using phone for verification tracking
            setStep('verify')
            toast.success(t('verificationCodeSent'))
        } catch (error: unknown) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
            toast.error(detail || t('registrationFailure'))
        } finally {
            setIsLoading(false)
        }
    }

    async function onVerifyOtp(values: z.infer<typeof otpSchema>) {
        setIsLoading(true)
        try {
            await registrationApi.verifyOtp({
                email: emailForVerification, // This is actually the phone number now
                otp_code: values.otp_code
            })
            setIsSuccess(true)
            toast.success(t('successTitle'))
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || t('invalidOtp'))
        } finally {
            setIsLoading(false)
        }
    }

    async function onResendOtp() {
        if (resendCooldown > 0 || isResending) return

        setIsResending(true)
        try {
            await registrationApi.resendOtp(emailForVerification)
            setResendCooldown(60)
            toast.success(t('verificationCodeSent'))
        } catch (error: unknown) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
            toast.error(detail || t('registrationFailure'))
        } finally {
            setIsResending(false)
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
                            {t('successTitle')}
                        </h1>
                        <p className="text-white/60 mb-10 leading-relaxed font-medium">
                            {t('successMessage')}
                        </p>
                        <Button
                            onClick={() => router.push("/")}
                            className="w-full h-16 rounded-2xl bg-white text-black hover:bg-primary hover:text-white text-lg font-heading font-black italic tracking-tight transition-all duration-700"
                        >
                            {t('back')}
                        </Button>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden selection:bg-primary/30 py-20">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[200px] animate-pulse-glow opacity-30" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[200px] animate-pulse-glow opacity-20 animation-delay-2000" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[620px] p-6 relative z-10"
            >
                <div className="p-10 md:p-14 rounded-[3.5rem] glass-card relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-shimmer-sweep" />

                    <div className="flex flex-col items-center">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-black tracking-tighter text-white font-heading italic uppercase leading-none mb-3">
                                {t('title')}
                            </h1>
                            <p className="text-white/40 text-sm italic font-medium">
                                {t('subtitle')}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 'details' ? (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="w-full"
                                >
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="name"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel className="font-micro ml-1 flex items-center gap-2"><User className="w-3 h-3" /> {t('name').toUpperCase()}</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder={t('namePlaceholder')}
                                                                    className="h-12 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-4 text-white font-bold text-sm"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="font-micro text-destructive" />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="phone"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel className="font-micro ml-1 flex items-center gap-2"><Phone className="w-3 h-3" /> {t('phone').toUpperCase()}</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder={t('phonePlaceholder')}
                                                                    className="h-12 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-4 text-white font-bold text-sm"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="font-micro text-destructive" />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                                <FormField
                                                    control={form.control}
                                                    name="daily_target_qty"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel className="font-micro ml-1 flex items-center gap-2">MILK QUANTITY (L)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    step="0.1"
                                                                    placeholder="1.0"
                                                                    className="h-12 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-4 text-white font-bold text-sm"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="font-micro text-destructive" />
                                                        </FormItem>
                                                    )}
                                                />

                                            <FormField
                                                control={form.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="font-micro ml-1 flex items-center gap-2"><MapPin className="w-3 h-3" /> {t('address').toUpperCase()}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t('addressPlaceholder')}
                                                                className="h-12 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-4 text-white font-bold text-sm"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="font-micro text-destructive" />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="password"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel className="font-micro ml-1 flex items-center gap-2"><Lock className="w-3 h-3" /> {t('password').toUpperCase()}</FormLabel>
                                                            <FormControl>
                                                                <div className="relative group/input">
                                                                    <Input
                                                                        type={showPassword ? "text" : "password"}
                                                                        placeholder="••••••••"
                                                                        className="h-12 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-4 pr-10 text-white font-bold text-sm"
                                                                        {...field}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors p-1"
                                                                    >
                                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="font-micro text-destructive" />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="confirmPassword"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel className="font-micro ml-1 flex items-center gap-2"><Lock className="w-3 h-3" /> {t('confirmPassword').toUpperCase()}</FormLabel>
                                                            <FormControl>
                                                                <div className="relative group/input">
                                                                    <Input
                                                                        type={showPassword ? "text" : "password"}
                                                                        placeholder="••••••••"
                                                                        className="h-12 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-xl transition-all duration-500 pl-4 pr-10 text-white font-bold text-sm"
                                                                        {...field}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors p-1"
                                                                    >
                                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="font-micro text-destructive" />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full h-16 rounded-2xl bg-white text-black hover:bg-primary hover:text-white text-lg font-heading font-black italic tracking-tight transition-all duration-700 group mt-4 overflow-hidden"
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t('submit').toUpperCase()}</span>}
                                            </Button>

                                            <button
                                                type="button"
                                                onClick={() => router.push("/")}
                                                className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-primary transition-colors font-micro mb-4"
                                            >
                                                <ChevronLeft className="w-3 h-3" /> {t('back').toUpperCase()}
                                            </button>
                                        </form>
                                    </Form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="verify"
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
                                            {t('verificationTitle')}
                                        </h2>
                                        <p className="text-white/40 text-sm font-medium leading-relaxed">
                                            {t('verificationDesc')}
                                        </p>
                                    </div>

                                    <Form {...otpForm}>
                                        <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="w-full space-y-6">
                                            <FormField
                                                control={otpForm.control}
                                                name="otp_code"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-4">
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t('otpPlaceholder')}
                                                                maxLength={6}
                                                                className="h-20 bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] rounded-2xl transition-all duration-500 text-center text-3xl font-black tracking-[0.5em] text-white"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="text-center font-micro text-destructive" />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full h-16 rounded-2xl bg-primary text-white hover:bg-white hover:text-black text-lg font-heading font-black italic tracking-tight transition-all duration-700 mt-4 shadow-glow-primary"
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t('verifyButton').toUpperCase()}</span>}
                                            </Button>

                                            <div className="flex flex-col gap-2 mt-4">
                                                <button
                                                    type="button"
                                                    disabled={resendCooldown > 0 || isResending}
                                                    onClick={onResendOtp}
                                                    className="w-full text-center text-white/40 hover:text-primary transition-colors font-micro uppercase italic py-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                                >
                                                    {isResending ? (
                                                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> PROCESSING...</span>
                                                    ) : resendCooldown > 0 ? (
                                                        `RESEND CODE IN ${resendCooldown}S`
                                                    ) : (
                                                        "RESEND VERIFICATION CODE"
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setStep('details')}
                                                    className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-primary transition-colors font-micro py-2 uppercase italic text-xs"
                                                >
                                                    <ChevronLeft className="w-3 h-3" /> {t('resubmitDetails').toUpperCase()}
                                                </button>
                                            </div>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* Cyber Diagnostics Footer */}
            <div className="absolute bottom-8 left-0 right-0 px-4 sm:px-10 flex justify-between items-center pointer-events-none opacity-20">
                <div className="flex gap-4 sm:gap-12">
                    <div className="flex flex-col">
                        <span className="font-micro text-[8px] mb-1">{tAuth('regionLabel')}</span>
                        <span className="font-heading font-black italic text-base sm:text-lg tracking-tighter">IN-WEST-1</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-micro text-[8px] mb-1">{tAuth('encryptionLabel')}</span>
                        <span className="font-heading font-black italic text-base sm:text-lg tracking-tighter">ECDSA_384</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-micro text-[8px] mb-1">{tAuth('systemUptime')}</span>
                    <span className="font-heading font-black italic text-base sm:text-lg tracking-tighter">99.999%</span>
                </div>
            </div>
        </div>
    )
}
