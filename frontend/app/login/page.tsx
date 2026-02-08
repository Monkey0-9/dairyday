"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Droplet, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
      // Axios will automatically include/set cookies if withCredentials is true
      const res = await axios.post(
        `${API_URL}/auth/login`,
        new URLSearchParams({ username: data.email, password: data.password }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          withCredentials: true
        }
      )

      const { user } = res.data

      // Store non-sensitive user info for UI (optional, middleware handles security)
      // localStorage is fine for UI hints, but NOT for auth tokens
      localStorage.setItem("user_role", user.role)
      localStorage.setItem("user_name", user.name)

      toast.success("Welcome back!")

      // Redirect based on role
      if (user.role === "ADMIN") {
        router.push("/admin/daily-entry")
      } else {
        router.push("/user/dashboard")
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header - High contrast */}
      <header className="bg-white border-b py-4 shadow-sm">
        <div className="max-w-md mx-auto px-4 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <Droplet className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">DairyOS</span>
          </Link>
        </div>
      </header>

      {/* Login Form - Clean card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="pt-8 pb-6 px-6">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
              <p className="text-gray-600 mt-2">View milk records & pay bills</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register("email")}
                  className="h-12 text-base border-gray-300 focus:border-primary focus:ring-primary"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    {...register("password")}
                    className="h-12 text-base border-gray-300 focus:border-primary focus:ring-primary pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button - High contrast */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-gray-500 mt-6">
              © {new Date().getFullYear()} DairyOS
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

