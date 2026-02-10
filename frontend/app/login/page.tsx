"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Milk, Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

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

const loginSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
      const response = await authApi.login(values)
      const { access_token, refresh_token, user } = response.data
      authApi.setTokens(access_token, refresh_token)
      authApi.setUserData(user?.id, user?.role)
      toast.success("Login successful")

      if (user?.role?.toLowerCase() === "admin") {
        router.push("/admin/daily-entry")
      } else {
        router.push("/customer/dashboard")
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-5 relative overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Animated gradient bg */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 50% at 30% 50%, rgba(139,92,246,0.1) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 50% at 70% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Slow moving orb */}
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)", top: "10%", left: "20%" }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        <div
          className="rounded-3xl p-8 border border-white/[0.08]"
          style={{
            background: "rgba(17,17,17,0.6)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4"
              style={{ boxShadow: "0 8px 24px rgba(99,102,241,0.25)" }}
            >
              <Milk className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">DairyOS</h1>
            <p className="text-xs text-neutral-500 mt-1 font-medium">Sign in to your account</p>
          </motion.div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Username / Phone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="9876543210"
                        {...field}
                        disabled={isLoading}
                        className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={isLoading}
                          className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 pr-12 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-rose-400 text-xs" />
                  </FormItem>
                )}
              />

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl font-bold text-sm text-white border-0 transition-shadow"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
                    boxShadow: "0 8px 24px rgba(99,102,241,0.25)",
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </motion.div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-neutral-700 font-medium">
            End-to-end encrypted • Secure authentication
          </p>
        </div>
      </motion.div>
    </div>
  )
}
