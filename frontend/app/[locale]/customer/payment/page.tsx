"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Shield,
  Lock,
  CheckCircle2,
  Sparkles,
  Download,
  Loader2,
  History as HistoryIcon,
  Copy,
  Check,
  Share2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import { formatCurrency, getStatusKey } from "@/lib/i18n-utils"
import Image from "next/image"

import { billsApi, authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"
import { PremiumLoadingState } from "@/components/ui/state-displays"
import { TableSkeleton } from "@/components/skeletons"

interface Bill {
  id: string;
  month: string;
  total_amount: number;
  total_liters: number;
  status: "PAID" | "UNPAID";
  pdf_url?: string;
  is_locked?: boolean;
  utr_reference?: string;
}

export default function PaymentPage() {
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [utrReference, setUtrReference] = useState("")
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const locale = useLocale()
  const t = useTranslations("Payment")
  const tCommon = useTranslations("Common")

  // Lazy load Razorpay script
  useEffect(() => {
    const scriptId = "razorpay-checkout-js"
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script")
      script.id = scriptId
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  useEffect(() => {
    setUserId(authApi.getUserId())
    setMounted(true)
  }, [])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-bills"],
    queryFn: async () => {
      const res = await billsApi.list()
      return res.data
    },
    enabled: !!userId,
    staleTime: 60000,
  })

  const bills = data?.bills || []
  const latestBill = bills[0] as Bill | undefined
  const unpaidBill = bills.find((b: Bill) => b.status === "UNPAID")
  const activeBill = (unpaidBill || latestBill) as Bill | undefined

  const billAmount = Number(activeBill?.total_amount ?? 0)
  const totalLiters = Number(activeBill?.total_liters ?? 0)
  const isPaid = activeBill?.status === "PAID"

  const UPI_ID = "9980592787@ybl"

  const handlePayment = async () => {
    const amount = billAmount
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=DairyDays&am=${amount}&cu=INR&tn=Bill-${activeBill?.month || 'Payment'}`
    setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`)
    setIsUpiModalOpen(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    toast.success(t('upiCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmitUtr = async () => {
    if (!activeBill || !utrReference.trim()) {
      toast.error(t('utrRequired'))
      return
    }

    const utrRegex = /^[0-9]{12}$/;
    if (!utrRegex.test(utrReference)) {
      toast.error(t('utrInvalid'));
      return;
    }

    setIsSubmittingUtr(true)
    try {
      await billsApi.submitUtr(activeBill.id, utrReference)
      toast.success(t('utrSuccess'))
      setUtrReference("")
      setIsUpiModalOpen(false)
      refetch()
    } catch {
      toast.error(t('utrFailed'))
    } finally {
      setIsSubmittingUtr(false)
    }
  }

  const activeBillId = activeBill?.id
  useEffect(() => {
    if (!isUpiModalOpen || !activeBillId) return
    const interval = setInterval(async () => {
      const result = await refetch()
      const refreshedBills = result.data?.bills || []
      const currentBill = refreshedBills.find((b: Bill) => b.id === activeBillId)
      if (currentBill?.status === "PAID") {
        setIsUpiModalOpen(false)
        setQrCode(null)
        clearInterval(interval)
        toast.success(t('paymentSuccess'))
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [isUpiModalOpen, activeBillId, refetch, t])

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/40 relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[180px] rounded-full opacity-40 animate-pulse-glow" />
      </div>

      <div className="container max-w-5xl mx-auto px-6 py-12 relative z-10 space-y-16">
        <PageHeader
          title={t('title')}
          highlight={t('portal')}
          subtitle={t('description') || "Manage your subscriptions and payments"}
          badge="FINANCIAL_NODE_v4.2"
          badgeIcon={<Shield size={12} className="text-primary" aria-hidden="true" />}
        />

        <div className="flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <PremiumLoadingState key="loading" />
            ) : !activeBill ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-12 rounded-[2.5rem] glass-card bg-foreground/[0.02] border border-border/10"
              >
                <Sparkles className="h-12 w-12 text-yellow-500 mx-auto mb-6 opacity-40" />
                <h2 className="text-2xl font-black font-heading italic uppercase">{t('allCaughtUp')}</h2>
                <p className="font-micro text-foreground/20 uppercase tracking-widest mt-2">{t('noBills')}</p>
              </motion.div>
            ) : isPaid ? (
              <motion.div
                key="paid"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 relative z-10 py-10"
              >
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-glow-emerald/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-4xl font-black font-heading italic uppercase text-foreground mb-2">{t('noDues')}</h1>
                  <p className="font-micro text-foreground/20 uppercase tracking-widest italic">
                    {t('lastBillPaid', { month: activeBill?.month || '' })}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="unpaid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm relative z-10 space-y-8"
              >
                <div className="rounded-[2.5rem] p-10 border border-border/10 text-center glass-card bg-background/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12 transition-transform duration-1000 group-hover:scale-125 text-primary">
                    <HistoryIcon size={120} />
                  </div>

                  <div className="flex items-center justify-center gap-2 mb-8 relative z-10">
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-micro text-[10px] px-3 py-1 uppercase tracking-widest">
                      {t('dueFor', { month: activeBill?.month || '' })}
                    </Badge>
                  </div>

                  <p className="font-micro text-foreground/20 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 relative z-10">
                    {t('totalPayable')}
                  </p>

                  {activeBill?.utr_reference && activeBill?.status === "UNPAID" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
                    >
                      <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      <span className="font-micro text-[9px] text-blue-500 uppercase tracking-widest font-black">{t('verificationInProgress')}</span>
                    </motion.div>
                  )}

                  <h1 className="text-6xl font-black font-heading italic text-foreground tracking-tighter leading-none mb-8 relative z-10 group-hover:text-primary transition-colors duration-1000">
                    ₹{mounted ? formatCurrency(billAmount, locale) : "--"}
                  </h1>

                  <div className="flex justify-between items-center py-6 border-t border-border/5 relative z-10">
                    <span className="font-micro text-foreground/20 uppercase tracking-widest">{t('totalConsumption')}</span>
                    <span className="text-xl font-heading font-black italic text-foreground/60">{totalLiters.toFixed(1)} <span className="text-xs font-sans font-normal opacity-40 not-italic">{t('liters').toUpperCase()[0]}</span></span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => activeBill && handlePayment()}
                    disabled={isLoading}
                    className="w-full h-16 rounded-2xl font-black italic text-xl tracking-tight bg-primary hover:bg-foreground text-white hover:text-background shadow-glow-primary/20 transition-all duration-500 flex items-center justify-center gap-3 relative z-10"
                  >
                    <Lock className="h-5 w-5" />
                    {t('payNow').toUpperCase()}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {bills.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-6 px-10 py-4 bg-foreground/[0.02] rounded-2xl border border-border/5">
              <HistoryIcon className="h-5 w-5 text-indigo-500" />
              <span className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('historyTitle')}</span>
              <div className="h-[1px] flex-1 bg-foreground/5" />
            </div>

            <div className="rounded-[2.5rem] border-border/10 bg-background/40 backdrop-blur-3xl overflow-x-auto shadow-2xl">
              {isLoading ? (
                <div className="p-8">
                  <TableSkeleton rows={5} cols={5} />
                </div>
              ) : (
                <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/5 h-20 px-8">
                    <TableHead className="font-micro text-foreground/40 uppercase tracking-widest pl-10">{t('month')}</TableHead>
                    <TableHead className="text-right font-micro text-foreground/40 uppercase tracking-widest">{t('liters')}</TableHead>
                    <TableHead className="text-right font-micro text-foreground/40 uppercase tracking-widest">{t('amount')}</TableHead>
                    <TableHead className="text-center font-micro text-foreground/40 uppercase tracking-widest">{t('status')}</TableHead>
                    <TableHead className="text-right font-micro text-foreground/40 uppercase tracking-widest pr-10">{t('invoice')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill: Bill) => (
                    <TableRow key={bill.id} className="hover:bg-primary/[0.02] transition-all duration-700 border-b border-border/5 h-24 px-8 group">
                      <TableCell className="font-heading font-black italic text-xl text-foreground pl-10 group-hover:text-primary transition-colors">{bill.month}</TableCell>
                      <TableCell className="text-right font-heading font-bold italic text-foreground/60">{Number(bill.total_liters).toFixed(1)} <span className="text-[10px] opacity-20 not-italic">{t('liters').toUpperCase()[0]}</span></TableCell>
                      <TableCell className="text-right font-heading font-black italic text-2xl text-foreground">₹{formatCurrency(Number(bill.total_amount), locale)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "rounded-full px-4 py-1 font-black italic uppercase text-[10px] tracking-widest transition-all",
                          bill.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : bill.utr_reference
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-primary/10 text-primary animate-pulse"
                        )}>
                          {bill.status === "UNPAID" && bill.utr_reference
                            ? t('verifying')
                            : tCommon(`status.${getStatusKey(bill.status)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const text = encodeURIComponent(
                                `DairyDay Bill — ${bill.month}: ₹${Number(bill.total_amount).toFixed(0)}`
                              );
                              window.open(`https://wa.me/?text=${text}`, '_blank');
                            }}
                            className="h-12 w-12 p-0 rounded-full bg-foreground/[0.03] border border-border/5 text-foreground/20 hover:text-emerald-500 transition-all"
                            aria-label="Share via WhatsApp"
                          >
                            <Share2 size={18} />
                          </Button>
                          <PdfDownloadButton bill={bill} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isUpiModalOpen} onOpenChange={setIsUpiModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black border-none rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-center font-heading font-black italic text-3xl uppercase tracking-tighter">{t('scanToPay')}</DialogTitle>
            <DialogDescription className="text-center font-micro uppercase tracking-widest text-black/40">
              {t('scanWithUpi')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 pt-4">
            <div className="p-4 bg-white rounded-[2rem] shadow-xl border border-gray-100">
              {qrCode && <Image src={qrCode} alt="QR" width={250} height={250} className="rounded-xl" unoptimized />}
            </div>

            <div className="flex items-center gap-3 bg-gray-50 px-5 py-4 rounded-2xl w-full">
              <div className="flex-1">
                <p className="font-micro text-[10px] uppercase tracking-widest text-black/40 mb-1">{t('upiId')}</p>
                <p className="font-mono font-bold text-lg text-black">{UPI_ID}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="rounded-xl h-12 w-12 border-gray-200"
                aria-label={tCommon('accessibility.copyUpi')}
              >
                {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
              </Button>
            </div>

            <div className="w-full space-y-4 pt-4 border-t border-gray-100">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-black/40">{t('enterUtr')}</p>
                <Input
                  placeholder={t('utrPlaceholder')}
                  value={utrReference}
                  onChange={(e) => setUtrReference(e.target.value)}
                  className="h-14 rounded-xl border-gray-200 bg-gray-50 text-black font-mono"
                />
                <Button
                  onClick={handleSubmitUtr}
                  disabled={isSubmittingUtr || !utrReference.trim()}
                  className="w-full h-14 rounded-xl bg-primary text-white font-bold uppercase"
                >
                  {isSubmittingUtr ? <Loader2 className="h-5 w-5 animate-spin" /> : t('verifyPayment')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PdfDownloadButton({ bill }: { bill: Bill }) {
  const { data: statusData } = useQuery({
    queryKey: ["pdf-status", bill.id],
    queryFn: async () => {
      const res = await billsApi.getPdfStatus(bill.id)
      return res.data
    },
    enabled: !!bill.is_locked && !bill.pdf_url,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string; pdf_url?: string } | undefined
      return data?.status === "completed" ? false : 5000
    },
  })

  const pdfUrl = bill.pdf_url || (statusData as { pdf_url?: string })?.pdf_url

  if (pdfUrl) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(pdfUrl, '_blank')}
        className="h-12 w-12 p-0 rounded-full bg-foreground/[0.03] border border-border/5 text-foreground/20 hover:text-primary transition-all"
      >
        <Download size={20} />
      </Button>
    )
  }

  if (bill.is_locked) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-12 w-12 p-0 opacity-20">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    )
  }

  return <span className="font-micro text-foreground/5 tracking-widest">-</span>
}
