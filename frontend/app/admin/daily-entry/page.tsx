"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, addDays, subDays } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Minus,
  Save,
  SearchX,
  Users,
  Milk,
  CheckCircle2,
  Loader2,
  Copy
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { adminApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatApiError } from "@/lib/utils"

export default function DailyEntryPage() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [localEntries, setLocalEntries] = useState<Record<string, number>>({})
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set())

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const { data: entries, isLoading } = useQuery({
    queryKey: ["daily-entry", dateStr],
    queryFn: async () => {
      const res = await adminApi.getDailyEntry(dateStr)
      // Initialize local state from server data
      const initialEntries: Record<string, number> = {}
      res.data.forEach((entry: any) => {
        initialEntries[entry.id] = entry.liters
      })
      setLocalEntries(initialEntries)
      setUnsavedIds(new Set())
      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: any[]) => adminApi.saveDailyEntry(dateStr, data),
    onSuccess: () => {
      // Invalidate ALL related queries to ensure data consistency across pages
      queryClient.invalidateQueries({ queryKey: ["daily-entry"] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["consumption"] })
      queryClient.invalidateQueries({ queryKey: ["consumption-grid"] })
      queryClient.invalidateQueries({ queryKey: ["bills"] })
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] })
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
      
      toast.success(`Saved ${unsavedIds.size} entries successfully`)
      setUnsavedIds(new Set())
    },
    onError: () => {
      toast.error("Failed to save entries")
    }
  })


  const handleLiterChange = (id: string, value: number) => {
    const newValue = Math.max(0, Math.round(value * 10) / 10)
    setLocalEntries(prev => ({ ...prev, [id]: newValue }))
    setUnsavedIds(prev => new Set(prev).add(id))
  }

  const filteredEntries = useMemo(() => {
    if (!entries) return []
    return entries.filter((entry: any) =>
      (entry.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (entry.phone?.includes(searchQuery) ?? false)
    )
  }, [entries, searchQuery])

  const totalLiters = useMemo(() => {
    return Object.values(localEntries).reduce((sum, val) => sum + val, 0)
  }, [localEntries])

  const handleSave = () => {
    if (unsavedIds.size === 0) return
    const dataToSave = entries
      .filter((e: any) => unsavedIds.has(e.id))
      .map((e: any) => ({
        user_id: e.id,
        liters: localEntries[e.id],
      }))
    saveMutation.mutate(dataToSave)
  }

  // Copy from Yesterday feature
  const copyFromYesterday = useCallback(async () => {
    const yesterdayStr = format(subDays(selectedDate, 1), "yyyy-MM-dd")
    try {
      const res = await adminApi.getDailyEntry(yesterdayStr)
      const yesterdayData = res.data
      if (!yesterdayData || yesterdayData.length === 0) {
        toast.error("No data from yesterday to copy")
        return
      }
      const newEntries: Record<string, number> = {}
      const newUnsaved = new Set<string>()
      yesterdayData.forEach((entry: any) => {
        if (entry.liters > 0) {
          newEntries[entry.id] = entry.liters
          newUnsaved.add(entry.id)
        }
      })
      setLocalEntries(prev => ({ ...prev, ...newEntries }))
      setUnsavedIds(prev => new Set([...prev, ...newUnsaved]))
      toast.success(`Copied ${newUnsaved.size} entries from yesterday`)
    } catch (error) {
      toast.error(formatApiError(error))
    }
  }, [selectedDate])
  
  // Clear all unsaved changes
  const clearChanges = () => {
    if (unsavedIds.size === 0) return
    const initialEntries: Record<string, number> = {}
    entries?.forEach((entry: any) => {
      initialEntries[entry.id] = entry.liters
    })
    setLocalEntries(initialEntries)
    setUnsavedIds(new Set())
    toast.info("Unsaved changes cleared")
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Date Selector */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm sticky top-16 lg:top-0 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h2 className="font-bold text-lg">{format(selectedDate, "EEEE, d MMM")}</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Selected Date</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Users className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-bold">{entries?.length || 0}</span>
            <span className="text-xs text-muted-foreground">Customers</span>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mb-1" />
            <span className="text-2xl font-bold">{entries?.filter((e: any) => e.liters > 0).length || 0}</span>
            <span className="text-xs text-muted-foreground">Delivered</span>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Milk className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-2xl font-bold">{totalLiters.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">Liters</span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Row */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 h-12 gap-2"
          onClick={copyFromYesterday}
        >
          <Copy className="h-4 w-4" />
          Copy from Yesterday
        </Button>
        {unsavedIds.size > 0 && (
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-100 dark:border-red-900/20"
            onClick={clearChanges}
          >
            <SearchX className="h-4 w-4" />
            Clear Changes
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-10 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : filteredEntries.length > 0 ? (
          filteredEntries.map((entry: any) => (
            <Card
              key={entry.id}
              className={cn(
                "overflow-hidden transition-all border-none shadow-sm",
                unsavedIds.has(entry.id) ? "ring-2 ring-primary/20 bg-primary/5" : "bg-white dark:bg-slate-900"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-semibold text-lg">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">{entry.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => handleLiterChange(entry.id, (localEntries[entry.id] || 0) - 0.5)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <div className="relative w-24">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-12 text-center text-xl font-bold border-none bg-slate-100 dark:bg-slate-800 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={localEntries[entry.id] ?? 0}
                      onChange={(e) => handleLiterChange(entry.id, parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground font-medium">LTR</span>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => handleLiterChange(entry.id, (localEntries[entry.id] || 0) + 0.5)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <SearchX className="h-12 w-12 mb-4 opacity-20" />
            <p>No customers found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Floating Save Button */}
      {unsavedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 animate-in slide-in-from-bottom-5">
          <Button
            className="w-full h-14 rounded-full shadow-2xl text-lg font-bold gap-2"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save {unsavedIds.size} Changes
          </Button>
        </div>
      )}
    </div>
  )
}
