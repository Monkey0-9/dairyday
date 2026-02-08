"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { format, subDays, addDays, isToday, isFuture } from "date-fns"
import { 
  ChevronLeft, ChevronRight, Save, Loader2, Droplet, Check, 
  Plus, Minus, Search, Copy, Calendar, AlertCircle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/skeleton"
import { cn, debounce } from "@/lib/utils"
import { toast } from "sonner"

interface DailyEntryUser {
  user_id: string
  user_name: string
  quantity: number
  is_locked: boolean
}

interface DailyEntryStats {
  totalCustomers: number
  totalWithDelivery: number
  totalLiters: number
  changesCount: number
}

export default function DailyEntryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<Record<string, number>>({})
  const [originalEntries, setOriginalEntries] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isCopying, setIsCopying] = useState(false)
  const queryClient = useQueryClient()
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const today = useMemo(() => new Date(), [])
  const dateStr = format(selectedDate, "yyyy-MM-dd")
  const displayDate = format(selectedDate, "d MMM yyyy")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  // Fetch daily entry data
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["dailyEntry", dateStr],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/admin/daily-entry?selected_date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return res.data as DailyEntryUser[]
    },
    enabled: !!token
  })

  // Fetch previous day data for copy functionality
  const { data: prevDayData } = useQuery({
    queryKey: ["dailyEntry", format(subDays(selectedDate, 1), "yyyy-MM-dd")],
    queryFn: async () => {
      const prevDate = format(subDays(selectedDate, 1), "yyyy-MM-dd")
      const res = await axios.get(`${API_URL}/admin/daily-entry?selected_date=${prevDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const map: Record<string, number> = {}
      res.data.forEach((u: DailyEntryUser) => {
        map[u.user_id] = u.quantity
      })
      return map
    },
    enabled: !!token
  })

  // Fetch last week same day data
  const { data: lastWeekData } = useQuery({
    queryKey: ["dailyEntry", format(subDays(selectedDate, 7), "yyyy-MM-dd")],
    queryFn: async () => {
      const prevDate = format(subDays(selectedDate, 7), "yyyy-MM-dd")
      const res = await axios.get(`${API_URL}/admin/daily-entry?selected_date=${prevDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const map: Record<string, number> = {}
      res.data.forEach((u: DailyEntryUser) => {
        map[u.user_id] = u.quantity
      })
      return map
    },
    enabled: !!token
  })

  // Initialize entries when users data changes
  useEffect(() => {
    if (users && users.length > 0) {
      const entryMap: Record<string, number> = {}
      users.forEach(u => {
        entryMap[u.user_id] = u.quantity
      })
      setEntries(entryMap)
      setOriginalEntries(entryMap)
    } else if (users) {
      setEntries({})
      setOriginalEntries({})
    }
  }, [users])

  // Calculate stats
  const stats: DailyEntryStats = useMemo(() => {
    const totalCustomers = users?.length || 0
    const totalWithDelivery = Object.values(entries).filter(v => v > 0).length
    const totalLiters = Object.values(entries).reduce((a, b) => a + b, 0)
    const changesCount = Object.keys(entries).filter(
      uid => entries[uid] !== originalEntries[uid]
    ).length
    return { totalCustomers, totalWithDelivery, totalLiters, changesCount }
  }, [users, entries, originalEntries])

  // Debounced save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, number>) => {
      const payload = Object.entries(data).map(([user_id, quantity]) => ({
        user_id,
        quantity
      }))
      const res = await axios.post(
        `${API_URL}/admin/daily-entry?selected_date=${dateStr}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return res.data
    },
    onSuccess: () => {
      toast.success("All entries saved successfully!", {
        description: `${stats.changesCount} customer updates saved`
      })
      setOriginalEntries({ ...entries })
      queryClient.invalidateQueries({ queryKey: ["dailyEntry", dateStr] })
    },
    onError: (error: any) => {
      toast.error("Failed to save", {
        description: error.response?.data?.detail || "Please try again"
      })
    }
  })

  // Handle quantity change with debounce for live total
  const handleQuantityChange = useCallback((userId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEntries(prev => ({
      ...prev,
      [userId]: numValue < 0 ? 0 : numValue
    }))
  }, [])

  // Increment/decrement handlers
  const handleIncrement = (userId: string) => {
    setEntries(prev => ({
      ...prev,
      [userId]: Math.round(((prev[userId] || 0) + 0.1) * 10) / 10
    }))
  }

  const handleDecrement = (userId: string) => {
    setEntries(prev => ({
      ...prev,
      [userId]: Math.max(0, Math.round(((prev[userId] || 0) - 0.1) * 10) / 10)
    }))
  }

  // Copy previous day quantities
  const copyPreviousDay = useCallback(() => {
    if (!prevDayData) return
    setIsCopying(true)
    
    // Apply previous day quantities to non-locked users
    const updatedEntries = { ...entries }
    let changes = 0
    users?.forEach(user => {
      // Only overwrite if current value is 0 (unfilled) to avoid losing manual entry
      if (!user.is_locked && prevDayData[user.user_id] !== undefined && (updatedEntries[user.user_id] === 0 || updatedEntries[user.user_id] === undefined)) {
        updatedEntries[user.user_id] = prevDayData[user.user_id]
        changes++
      }
    })
    
    setEntries(updatedEntries)
    setIsCopying(false)
    
    if (changes > 0) {
      toast.success(`Copied entries for ${changes} customers from yesterday`)
    } else {
      toast.info("No empty entries to fill or no data from yesterday")
    }
  }, [prevDayData, entries, users])

  // Copy last week quantities
  const copyLastWeek = useCallback(() => {
    if (!lastWeekData) return
    setIsCopying(true)
    
    // Apply last week quantities to non-locked users
    const updatedEntries = { ...entries }
    let changes = 0
    users?.forEach(user => {
      // Only overwrite if current value is 0 (unfilled)
      if (!user.is_locked && lastWeekData[user.user_id] !== undefined && (updatedEntries[user.user_id] === 0 || updatedEntries[user.user_id] === undefined)) {
        updatedEntries[user.user_id] = lastWeekData[user.user_id]
        changes++
      }
    })
    
    setEntries(updatedEntries)
    setIsCopying(false)
    
    if (changes > 0) {
      toast.success(`Copied entries for ${changes} customers from last week`)
    } else {
      toast.info("No empty entries to fill or no data from last week")
    }
  }, [lastWeekData, entries, users])

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev =>
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    )
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, userId: string, index: number) => {
    const usersArray = filteredUsers
    if (e.key === 'Enter') {
      e.preventDefault()
      // Focus next input
      const nextIndex = index + 1
      const nextUser = usersArray[nextIndex]
      if (nextUser && inputRefs.current[nextUser.user_id]) {
        inputRefs.current[nextUser.user_id]?.focus()
        inputRefs.current[nextUser.user_id]?.select()
      } else if (stats.changesCount > 0) {
        // Save if on last input
        saveMutation.mutate(entries)
      }
    } else if (e.key === 'ArrowRight' && e.ctrlKey) {
      e.preventDefault()
      const nextUser = usersArray[index + 1]
      if (nextUser) {
        inputRefs.current[nextUser.user_id]?.focus()
        inputRefs.current[nextUser.user_id]?.select()
      }
    } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
      e.preventDefault()
      const prevUser = usersArray[index - 1]
      if (prevUser) {
        inputRefs.current[prevUser.user_id]?.focus()
        inputRefs.current[prevUser.user_id]?.select()
      }
    }
  }

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!users) return []
    if (!searchQuery) return users
    const query = searchQuery.toLowerCase()
    return users.filter(u => 
      u.user_name.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-20 mx-auto mb-2" />
                <Skeleton className="h-8 w-16 mx-auto" />
              </Card>
            ))}
          </div>
          <Card className="shadow-sm">
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-12 w-28" />
                </div>
              ))}
            </div>
          </Card>
        </main>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
            <p className="text-muted-foreground mb-4">
              Unable to fetch customer data. Please check your connection.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasChanges = stats.changesCount > 0
  const isTodayDate = isToday(selectedDate)
  const isFutureDate = isFuture(selectedDate)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm sticky top-0 z-20 border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <Droplet className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">Daily Entry</h1>
                  {isTodayDate && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      TODAY
                    </Badge>
                  )}
                  {isFutureDate && (
                    <Badge variant="outline" className="text-xs">
                      FUTURE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Enter milk delivered</p>
              </div>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('prev')}
                className="h-10 w-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 min-w-[160px] justify-center shadow-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{displayDate}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('next')}
                disabled={isTodayDate}
                className="h-10 w-10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {!isTodayDate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goToToday}
                  className="ml-1 font-medium"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className={cn(
            "p-4 text-center shadow-sm transition-all",
            isTodayDate ? "border-primary/30" : ""
          )}>
            <p className="text-sm text-muted-foreground font-medium">Customers</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalCustomers}</p>
          </Card>

          <Card className="p-4 text-center shadow-sm border-green-200 bg-green-50">
            <p className="text-sm text-green-700 font-medium">Delivered</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.totalWithDelivery}</p>
          </Card>

          <Card className="p-4 text-center shadow-sm border-blue-200 bg-blue-50">
            <p className="text-sm text-blue-700 font-medium">Total Liters</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.totalLiters.toFixed(2)}</p>
          </Card>

          <Card className={cn(
            "p-4 text-center shadow-sm transition-all",
            hasChanges ? "border-amber-300 bg-amber-50" : "border"
          )}>
            <p className="text-sm text-muted-foreground font-medium">Changes</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              hasChanges ? "text-amber-600" : "text-muted-foreground"
            )}>
              {stats.changesCount}
            </p>
          </Card>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {!isTodayDate && prevDayData && (
            <Button
              variant="outline"
              onClick={copyPreviousDay}
              disabled={isCopying}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {isCopying ? "Copying..." : "Copy Yesterday"}
            </Button>
          )}
        </div>

        {/* Customer List */}
        <Card className="shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">
                Customer Entries
              </h3>
              <Badge variant="secondary" className="text-xs">
                {filteredUsers.length} of {stats.totalCustomers}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          {/* Customer Rows with Zebra Striping */}
          {filteredUsers && filteredUsers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user, index) => {
                const hasUnsavedChange = entries[user.user_id] !== originalEntries[user.user_id]
                const isTodayUserEntry = user.is_locked && !isTodayDate

                return (
                  <div
                    key={user.user_id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4 transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                      hasUnsavedChange && !user.is_locked && "bg-amber-50/50"
                    )}
                  >
                    {/* Customer Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                        hasUnsavedChange && !user.is_locked
                          ? "bg-primary/20 text-primary"
                          : "bg-primary/10 text-primary"
                      )}>
                        {getInitials(user.user_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.user_name}</p>
                        {user.is_locked && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Locked (past date)
                          </p>
                        )}
                        {hasUnsavedChange && !user.is_locked && (
                          <p className="text-xs text-amber-600">
                            Changed from {originalEntries[user.user_id]?.toFixed(1) || 0}L
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity Input with +/- Controls */}
                    <div className="flex items-center gap-2 sm:ml-4">
                      <div className="relative flex items-center">
                        {/* Minus Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDecrement(user.user_id)}
                          disabled={user.is_locked || (entries[user.user_id] || 0) === 0}
                          className={cn(
                            "h-10 w-10 rounded-r-none border-r",
                            entries[user.user_id] === 0 && "opacity-50"
                          )}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        {/* Number Input */}
                        <input
                          ref={(el) => { inputRefs.current[user.user_id] = el }}
                          type="number"
                          min="0"
                          step="0.1"
                          value={entries[user.user_id] === 0 ? "" : entries[user.user_id]}
                          onChange={(e) => handleQuantityChange(user.user_id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, user.user_id, index)}
                          disabled={user.is_locked}
                          placeholder="0.0"
                          className={cn(
                            "w-28 h-12 text-center text-2xl font-bold border-x-0 focus:ring-2 focus:ring-primary focus:border-primary",
                            "placeholder:text-gray-300 transition-all",
                            hasUnsavedChange && !user.is_locked
                              ? "bg-primary/5 border-primary text-primary"
                              : "bg-white",
                            user.is_locked ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
                          )}
                          aria-label={`Quantity for ${user.user_name}`}
                        />

                        {/* Plus Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleIncrement(user.user_id)}
                          disabled={user.is_locked}
                          className="h-10 w-10 rounded-l-none border-l"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <span className="text-gray-500 font-medium w-6 text-lg">L</span>
                      
                      {/* Saved indicator */}
                      {!user.is_locked && (
                        <div className="w-6">
                          {hasUnsavedChange ? (
                            <span className="w-2 h-2 bg-amber-500 rounded-full block" />
                          ) : entries[user.user_id] > 0 ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Droplet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {searchQuery ? "No customers match your search" : "No customers found"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? "Try a different search term" : "Add customers to start entering milk"}
              </p>
            </div>
          )}
        </Card>

        {/* Save Button - Sticky at bottom on mobile */}
        <div className="sticky bottom-4 z-10">
          <Button
            onClick={() => saveMutation.mutate(entries)}
            disabled={!hasChanges || saveMutation.isPending}
            size="lg"
            className={cn(
              "w-full h-14 text-lg font-bold shadow-lg transition-all",
              hasChanges
                ? "bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-400 ring-offset-2"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save All ({stats.changesCount} changes)
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                All Saved
              </>
            )}
          </Button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="text-center text-sm text-muted-foreground bg-white/50 rounded-lg p-3">
          <p className="font-medium mb-1">Keyboard Shortcuts</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span><kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Tab</kbd> Next field</span>
            <span><kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd> Save all</span>
            <span><kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+→</kbd> Next entry</span>
            <span><kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+←</kbd> Previous</span>
          </div>
        </div>
      </main>
    </div>
  )
}

// Lock icon component for locked entries
function Lock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

