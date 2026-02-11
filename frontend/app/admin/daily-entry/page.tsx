"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, addDays, subDays } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Save,
  Plus,
  Minus,
  Copy,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import CountUp from "react-countup"

import { usersApi, adminApi } from "@/lib/api"
import { useTranslation } from "@/context/language-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/* ─── Types ─── */
interface Customer {
  id: string
  name: string
  phone: string
  default_quantity: number
}

interface DailyEntryResponse {
  id: string
  name: string
  liters: number
  is_locked: boolean
}

export default function AdminDailyEntry() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [search, setSearch] = useState("")
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const { t } = useTranslation()
  
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, "yyyy-MM-dd")

  useEffect(() => {
    setMounted(true)
  }, [])

  /* ─── Queries ─── */
  const { data: customers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => usersApi.list().then((r) => r.data),
  })

  // Prefill when current entries load
  const { data: currentEntries, isLoading: isEntriesLoading } = useQuery({
    queryKey: ["daily-entries", dateStr],
    queryFn: () => adminApi.getDailyEntry(dateStr).then((r) => r.data),
  })

  useEffect(() => {
    if (currentEntries && customers) {
      const nextMap: Record<string, number> = {}
      customers.forEach((c: Customer) => {
        // API returns "id" as user_id and "liters" as quantity
        const found = currentEntries.find((e: DailyEntryResponse) => e.id === c.id)
        nextMap[c.id] = found ? (found.liters ?? 0) : c.default_quantity
      })
      setQuantities(nextMap)
    } else if (customers) {
      const nextMap: Record<string, number> = {}
      customers.forEach((c: Customer) => {
        nextMap[c.id] = c.default_quantity
      })
      setQuantities(nextMap)
    }
  }, [currentEntries, customers])

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    return customers.filter((c: Customer) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
  }, [customers, search])

  const totalLiters = useMemo(() => {
    return Object.values(quantities).reduce((a, b) => a + (Number(b) || 0), 0)
  }, [quantities])

  /* ─── Mutation ─── */
  const saveMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(quantities).map(([userId, qty]) => ({
        user_id: userId,
        date: dateStr,
        liters: qty, // API expects 'liters' in POST? Wait, let's check.
        quantity: qty // Or quantity? admin.py line 130: quantity = float(entry.get("liters", 0))
      }))
      return adminApi.saveDailyEntry(dateStr, entries)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-entries"] })
      toast.success(t('save'))
    },
    onError: () => toast.error("Failed to save entries"),
  })

  /* ─── Handlers ─── */
  const handleQtyChange = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (Number(prev[id] || 0) + delta)),
    }))
  }

  const handleManualChange = (id: string, val: string) => {
    const num = parseFloat(val)
    setQuantities((prev) => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num,
    }))
  }

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))

  const handleCopyYesterday = async () => {
      if (!customers) return
      setIsCopying(true)
      const yesterday = subDays(selectedDate, 1)
      const yesterdayStr = format(yesterday, "yyyy-MM-dd")
      
      try {
          const res = await adminApi.getDailyEntry(yesterdayStr)
          const entries = res.data
          
          const newMap: Record<string, number> = {}
          customers.forEach((c: Customer) => {
               // Fix mapping: e.id is the user ID, e.liters is the value
               const found = entries.find((e: DailyEntryResponse) => e.id === c.id)
               newMap[c.id] = found ? (found.liters ?? 0) : 0
          })
          
          setQuantities(newMap)
          toast.success(`Pasted consumption from yesterday (${format(yesterday, "MMM dd")})`)
      } catch (e) {
          toast.error("Failed to fetch yesterday's data")
      } finally {
          setIsCopying(false)
      }
  }

  return (
    <div className="min-h-screen pb-24 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur z-20 py-2 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {format(selectedDate, "yyyy")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {format(selectedDate, "dd MMM, EEE")}
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCopyYesterday}
            disabled={isCopying}
            className="ml-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title={t('copyFromYesterday')}
          >
            {isCopying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
          </Button>

        </div>
        
        <div className="text-right">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {t('total')}
          </p>
          <p className="text-2xl font-black text-primary leading-none tabular-nums">
            {mounted ? <CountUp end={totalLiters} decimals={1} duration={0.5} /> : totalLiters} L
          </p>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchCustomers')}
          className="pl-10 h-10"
        />
      </div>

      {/* ── List ── */}
      <div className="space-y-3">
        {filteredCustomers.map((customer: Customer) => {
          const qty = quantities[customer.id] ?? 0
          return (
            <div
              key={customer.id}
              className="rounded-lg p-4 border bg-card flex items-center justify-between"
            >
              <div>
                <p className="font-bold">{customer.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {customer.phone}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQtyChange(customer.id, -0.5)}
                  className="h-8 w-8 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="w-16 text-center">
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => handleManualChange(customer.id, e.target.value)}
                    className="w-full bg-transparent text-center text-xl font-bold focus:outline-none tabular-nums"
                  />
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQtyChange(customer.id, 0.5)}
                  className="h-8 w-8 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {t('noCustomersFound')}
          </div>
        )}
      </div>

      {/* ── Footer Save ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-background/95 backdrop-blur border-t flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full md:w-auto font-bold"
          size="lg"
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saveMutation.isPending ? t('saving') : t('saveAllChanges')}
        </Button>
      </div>
    </div>
  )
}
