"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Droplet, Users, FileText, DollarSign, Calendar, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface Stats {
  kpis?: {
    total_revenue?: number
    active_customers?: number
    pending_payments?: number
    unpaid_amount?: number
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    if (!token) {
      router.push("/login")
      return
    }

    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_URL}/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router, token])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("access_token")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_role")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - High contrast */}
      <header className="bg-card shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shadow-sm">
              <Droplet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Overview</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions - Bold cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/admin/daily-entry">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-blue-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <Calendar className="h-7 w-7 text-blue-700" />
                  </div>
                  <h3 className="font-bold text-foreground">Daily Entry</h3>
                  <p className="text-sm text-muted-foreground mt-1">Enter milk delivered</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/bills">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-green-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <FileText className="h-7 w-7 text-green-700" />
                  </div>
                  <h3 className="font-bold text-foreground">Bills</h3>
                  <p className="text-sm text-muted-foreground mt-1">Generate & view</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-purple-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-14 w-14 bg-purple-100 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <Users className="h-7 w-7 text-purple-700" />
                  </div>
                  <h3 className="font-bold text-foreground">Customers</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage customers</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/payments">
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-amber-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-14 w-14 bg-amber-100 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <DollarSign className="h-7 w-7 text-amber-700" />
                  </div>
                  <h3 className="font-bold text-foreground">Payments</h3>
                  <p className="text-sm text-muted-foreground mt-1">View collection</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats - High contrast numbers */}
        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold text-foreground">₹{stats.kpis?.total_revenue?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customers</p>
                    <p className="text-2xl font-bold text-foreground">{stats.kpis?.active_customers || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <FileText className="h-6 w-6 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Bills</p>
                    <p className="text-2xl font-bold text-foreground">{stats.kpis?.pending_payments || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-red-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unpaid</p>
                    <p className="text-2xl font-bold text-foreground">₹{stats.kpis?.unpaid_amount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Info - Clear text */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-bold text-gray-900">Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-100 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long" })}
                </p>
                <p className="text-sm font-medium text-gray-600 mt-1">Today</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">
                  {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
                <p className="text-sm font-medium text-gray-600 mt-1">Current Month</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-600">Next Billing</p>
                <p className="text-lg font-bold text-gray-900 mt-1">1st of next month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

