"use client"

import React, { useState } from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { useTranslations, useLocale } from "next-intl"
import { formatCurrency } from "@/lib/i18n-utils"
import { billsApi, usersApi } from "@/lib/api"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2, Clock, Copy, Send,
  Loader2, IndianRupee, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Bill {
  id: string
  month: string
  total_liters: number
  amount: number
  status: string
  utr_reference?: string
}

interface UserData {
  name: string
  email: string
  upi_id?: string
}

export default function PaymentPage() {
  const t = useTranslations("Payment")
  const locale = useLocale()
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const { data: me } = useQuery<UserData>({ queryKey: ["me"], queryFn: () => usersApi.getMe().then(r => r.data) })
  const { data: bills = [], isLoading, refetch } = useQuery<Bill[]>({
    queryKey: ["my-bills-payment"],
    queryFn: async () => {
      const res = await billsApi.list()
      const d = res.data
      return Array.isArray(d) ? d : (d.bills || d.items || d.data || [])
    },
    staleTime: 60_000,
  })

  const currentBill = bills.find(b => b.status !== "PAID")
  const paidBills = bills.filter(b => b.status === "PAID")

  const handleCopyUpi = (upi: string) => {
    navigator.clipboard.writeText(upi)
    toast.success(t("upiCopied"))
  }

  const handleSubmitUtr = async (billId: string) => {
    const utr = (utrInputs[billId] || "").trim()
    if (!utr || utr.length < 12) return toast.error(t("utrInvalid"))
    setSubmittingId(billId)
    try {
      await billsApi.submitUtr(billId, utr)
      toast.success(t("utrSuccess"))
      setUtrInputs(prev => ({ ...prev, [billId]: "" }))
      refetch()
    } catch (err) { toast.error(formatApiError(err)) }
    finally { setSubmittingId(null) }
  }

  const adminUpi = "dairydays@upi"

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <header className="border-b border-white/[0.03] pb-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.05] bg-white/[0.02] mb-2">
          <ShieldCheck className="h-1.5 w-1.5 text-primary" />
          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary italic">PAYMENT_PORTAL</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-black font-heading tracking-tight text-white italic uppercase">
          <span className="opacity-10 block">My</span>
          <span className="text-gradient -mt-1 block italic lowercase">{t("portal")}</span>
        </h1>
        {me && <p className="text-[10px] font-bold text-white/30 font-mono uppercase tracking-widest mt-1">{me.name}</p>}
      </header>

      {/* Active Bill */}
      {isLoading ? (
        <Skeleton className="h-48 w-full max-w-2xl mx-auto bg-white/5 rounded-2xl" />
      ) : currentBill ? (
        <AnimatePresence>
          <motion.div key="current-bill" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border border-primary/20 bg-primary/[0.03] relative overflow-hidden max-w-2xl mx-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary italic">{t("dueFor", { month: currentBill.month })}</p>
                  <p className="text-3xl font-black italic text-white mt-1">₹{formatCurrency(Number(currentBill.amount || 0), locale)}</p>
                  <p className="text-[10px] font-bold text-white/30 font-mono mt-0.5">
                    {Number(currentBill.total_liters || 0).toFixed(1)}L • {currentBill.month}
                  </p>
                </div>
                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border">
                  <Clock size={8} className="mr-1" />{t("unpaid")}
                </Badge>
              </div>

              {/* Premium Masterpiece QR Section */}
              <div className="flex flex-col items-center mt-6 mb-8">
                <div className="relative p-4 rounded-[2rem] bg-white shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] transition-transform duration-500 hover:scale-[1.02]">
                  <Image 
                    src="/qr-code.png" 
                    alt="Payment QR" 
                    width={224}
                    height={224}
                    className="w-56 h-56 rounded-2xl object-cover" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center border border-slate-100">
                        <Image 
                          src="/icons/icon-192x192.png" 
                          alt="Logo" 
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-md" 
                        />
                     </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => handleCopyUpi(adminUpi)}
                  className="mt-8 w-full max-w-sm border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl h-14 active:scale-[0.98] transition-all flex justify-between px-6 group"
                >
                  <span className="font-mono text-zinc-300 tracking-wider text-base">{adminUpi}</span>
                  <Copy className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                </Button>

                <div className="flex gap-4 w-full max-w-sm mt-4">
                   <Button 
                     className="flex-1 bg-[#1A73E8] hover:bg-[#1A73E8]/90 text-white rounded-xl h-12 shadow-[0_0_20px_-5px_rgba(26,115,232,0.5)] active:scale-95 transition-all font-black italic tracking-wide" 
                     onClick={() => window.location.href = `upi://pay?pa=${adminUpi}&am=${currentBill.amount}&cu=INR`}
                   >
                      GPay
                   </Button>
                   <Button 
                     className="flex-1 bg-[#5F259F] hover:bg-[#5F259F]/90 text-white rounded-xl h-12 shadow-[0_0_20px_-5px_rgba(95,37,159,0.5)] active:scale-95 transition-all font-black italic tracking-wide" 
                     onClick={() => window.location.href = `upi://pay?pa=${adminUpi}&am=${currentBill.amount}&cu=INR`}
                   >
                      PhonePe
                   </Button>
                </div>
                
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 mt-6">
                  <ShieldCheck size={12} className="text-emerald-400" />{t("securedBy", { gateway: "UPI Network" })}
                </p>
              </div>

              {/* UTR Input */}
              <div className="max-w-md mx-auto w-full">
                {currentBill.utr_reference ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                    <Clock size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{t("verificationInProgress")}</p>
                      <p className="text-[9px] text-amber-400/60 font-mono mt-0.5">UTR: {currentBill.utr_reference}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{t("enterUtr")}</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("utrPlaceholder")}
                        value={utrInputs[currentBill.id] || ""}
                        onChange={(e) => setUtrInputs(prev => ({ ...prev, [currentBill.id]: e.target.value }))}
                        className="h-10 bg-white/[0.02] border-white/5 rounded-xl text-white font-mono italic text-[12px] placeholder:text-white/10 flex-1"
                        maxLength={20}
                      />
                      <Button
                        onClick={() => handleSubmitUtr(currentBill.id)}
                        disabled={submittingId === currentBill.id}
                        className="h-10 px-4 rounded-xl bg-primary text-white hover:bg-primary/80 font-black italic text-[10px] uppercase tracking-widest gap-1.5 shrink-0"
                      >
                        {submittingId === currentBill.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        {t("verifyPayment")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 text-center border border-emerald-500/20 bg-emerald-500/[0.02]">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <p className="font-black italic text-emerald-400 uppercase tracking-widest">{t("allCaughtUp")}</p>
          <p className="text-[10px] text-white/30 font-bold mt-1">{t("noDues")}</p>
        </motion.div>
      )}

      {/* Billing History */}
      {paidBills.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 italic">{t("historyTitle")}</h2>
          <div className="rounded-xl border border-white/[0.03] bg-obsidian-800/40 backdrop-blur-3xl overflow-hidden">
            {paidBills.map((bill, i) => (
              <motion.div key={bill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between px-4 py-3 border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black italic text-white uppercase">{bill.month}</p>
                    <p className="text-[9px] font-bold text-white/30 font-mono">{Number(bill.total_liters || 0).toFixed(1)}L</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee size={10} className="text-white/30" />
                  <span className="text-sm font-black italic text-white">{formatCurrency(Number(bill.amount || 0), locale)}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border">
                    {t("paid")}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
