'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { MasterButton } from '@/components/ui/master-button'
import { PremiumInput } from '@/components/ui/premium-input'
import { GlassCard } from '@/components/ui/glass-card'
import { useToast } from '@/components/ui/toast-provider'
import { authApi } from '@/lib/api'

// Floating particles component
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Array<{left: number, top: number, duration: number, delay: number}>>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
      }))
    )
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Large blurred orbs */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px]"
      />
      
      <motion.div
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[150px]"
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await authApi.login({
        username: data.username,
        password: data.password,
      })

      const { access_token, refresh_token, user } = response.data
      authApi.setTokens(access_token, refresh_token)
      authApi.setUserData(user?.id, user?.role)

      showToast({
        type: 'success',
        title: 'Welcome back!',
        description: `Logged in as ${user?.role}`,
      })

      // Redirect based on role
      if (user?.role?.toLowerCase() === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/customer/dashboard')
      }
    } catch (error: { response?: { data?: { detail?: string } } } | unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      showToast({
        type: 'error',
        title: 'Login failed',
        description: err.response?.data?.detail || 'Invalid credentials',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <FloatingParticles />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/90" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <GlassCard padding="lg" className="shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Lock className="w-8 h-8 text-primary" />
              </motion.div>
            </motion.div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-foreground/60">
              Sign in to your DairyDay account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <PremiumInput
              label="Username"
              placeholder="Enter your username"
              icon={Lock}
              error={errors.username?.message}
              {...register('username')}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full pl-4 pr-12 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-foreground placeholder:text-foreground/30 focus:outline-none focus:bg-white/[0.06] focus:border-primary/50 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]"
                  {...register('password')}
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded bg-white/5 border-white/10 text-primary focus:ring-primary" />
                <span className="text-sm text-foreground/60">Remember me</span>
              </label>
              
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <MasterButton
              type="submit"
              loading={isLoading}
              fullWidth
              className="mt-6"
            >
              Sign In
              <ArrowRight className="w-5 h-5" />
            </MasterButton>
          </form>

          {/* Sign up link */}
          <p className="text-center mt-6 text-sm text-foreground/60">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign up
            </Link>
          </p>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.08]">
            <div className="flex items-center justify-center gap-2 text-xs text-foreground/40">
              <Shield className="w-4 h-4" />
              <span>256-bit TLS encryption</span>
            </div>
          </div>
        </GlassCard>

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-xl font-bold text-foreground mb-1">DairyDay</p>
          <p className="text-xs text-foreground/40">Premium milk delivery platform</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
