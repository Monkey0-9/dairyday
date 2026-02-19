"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Phone,
  MessageSquare,
  MessageCircle,
  ChevronRight,
  ExternalLink,
  Loader2,
  Ticket,
  HeadphonesIcon,
  LifeBuoy
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supportApi } from "@/lib/api"
import { cn } from "@/lib/utils"

const SUPPORT_NUMBER = "+919980592787"

const Scanline = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.5)_50%)] bg-[length:100%_4px] animate-scanline" />
  </div>
)

export default function AdminSupportPage() {
  const t = useTranslations("Admin.support")
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const [ticketData, setTicketData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM"
  })

  const createTicketMutation = useMutation({
    mutationFn: (data: typeof ticketData) => supportApi.create(data),
    onSuccess: () => {
      toast.success(t("ticketSuccess") || "TICKET_LOGGED_SUCCESSFULLY")
      setIsTicketOpen(false)
      setTicketData({ title: "", description: "", priority: "MEDIUM" })
    },
    onError: () => {
      toast.error("Failed to create ticket")
    }
  })

  const handleSubmit = () => {
    if (!ticketData.title || !ticketData.description) {
      toast.error("Please fill in all fields")
      return
    }
    createTicketMutation.mutate(ticketData)
  }

  const contactMethods = [
    {
      title: t("priorityHotline"),
      description: t("priorityDesc"),
      icon: Phone,
      value: "+91 99805 92787",
      action: () => window.open(`tel:${SUPPORT_NUMBER}`),
      color: "emerald",
      gradient: "from-emerald-500/20 to-teal-500/5",
      tag: t("liveVoiceNode")
    },
    {
      title: t("whatsapp"),
      description: t("whatsappDesc"),
      icon: MessageCircle,
      value: "INSTANT_MSG_RELAY",
      action: () => window.open(`https://wa.me/${SUPPORT_NUMBER.replace("+", "")}`),
      color: "blue",
      gradient: "from-blue-500/20 to-indigo-500/5",
      tag: t("whatsappTag")
    },
    {
      title: t("smsAlerts"),
      description: t("smsDesc"),
      icon: MessageSquare,
      value: "EMERGENCY_PING",
      action: () => window.open(`sms:${SUPPORT_NUMBER}`),
      color: "amber",
      gradient: "from-amber-500/20 to-orange-500/5",
      tag: t("smsTag")
    }
  ]

  return (
    <div className="space-y-8 relative pb-20">
      {/* Cinematic Header Protocol */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-white/[0.05] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary shadow-glow-primary animate-pulse" />
            <span className="font-micro text-[10px] text-primary tracking-[0.6em] uppercase">{t('opsSupport')}</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-black font-heading italic uppercase leading-none text-white">
            System <span className="text-gradient">Operations</span>
          </h1>
          <p className="text-white/40 font-heading font-medium italic text-sm tracking-tight max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 h-8 px-4 rounded-lg font-micro text-[8px] uppercase tracking-[0.4em] italic shadow-glow-emerald/5">
            {t('systemGuard')}
          </Badge>

          <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-6 rounded-xl bg-white text-black hover:bg-primary hover:text-white font-heading font-black italic text-sm uppercase gap-2 transition-all duration-700 shadow-glow-primary/10">
                <Ticket className="h-4 w-4" />
                {t("createTicket").toUpperCase()}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-obsidian-900 border-white/5 text-white shadow-2xl backdrop-blur-3xl rounded-2xl p-6 sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-heading font-black italic uppercase tracking-tighter">
                  {t("createTicket")}
                </DialogTitle>
                <DialogDescription className="font-micro text-[8px] uppercase tracking-[0.2em] text-white/40">
                  {t('anomalyLog')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="font-micro text-[9px] uppercase tracking-[0.2em] text-white/40 italic">{t('titleVector')}</Label>
                  <Input
                    id="title"
                    value={ticketData.title}
                    onChange={(e) => setTicketData({ ...ticketData, title: e.target.value })}
                    className="h-10 bg-white/[0.02] border-white/5 rounded-xl font-bold italic focus:border-primary/40 focus:bg-white/[0.04] text-sm"
                    placeholder="Brief description of the anomaly..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority" className="font-micro text-[9px] uppercase tracking-[0.2em] text-white/40 italic">{t('priorityLevel')}</Label>
                  <Select
                    value={ticketData.priority}
                    onValueChange={(value: string) => setTicketData({ ...ticketData, priority: value })}
                  >
                    <SelectTrigger className="h-10 bg-white/[0.02] border-white/5 rounded-xl font-bold italic focus:border-primary/40 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10 rounded-xl glass-card text-white">
                      <SelectItem value="LOW">{t('lowObservation').toUpperCase()}</SelectItem>
                      <SelectItem value="MEDIUM">{t('mediumConcern').toUpperCase()}</SelectItem>
                      <SelectItem value="HIGH">{t('highAlert').toUpperCase()}</SelectItem>
                      <SelectItem value="CRITICAL">{t('criticalFailure').toUpperCase()}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="font-micro text-[9px] uppercase tracking-[0.2em] text-white/40 italic">{t('diagnosticData')}</Label>
                  <Textarea
                    id="description"
                    value={ticketData.description}
                    onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                    rows={4}
                    className="bg-white/[0.02] border-white/5 rounded-xl font-medium resize-none focus:border-primary/40 focus:bg-white/[0.04] text-sm"
                    placeholder="Detailed system logs or observation notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={createTicketMutation.isPending}
                  className="w-full h-10 bg-primary text-white hover:bg-primary/90 rounded-xl font-heading font-black italic uppercase tracking-wider text-sm shadow-glow-primary/20"
                >
                  {createTicketMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('transmitTicket').toUpperCase()}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Communications Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {contactMethods.map((method, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            onClick={method.action}
            className="group relative cursor-pointer"
          >
            <div className="absolute inset-0 bg-white/[0.02] rounded-2xl transform transition-transform duration-500 group-hover:scale-105" />
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl bg-gradient-to-br blur-xl", method.gradient)} />

            <div className="relative p-6 rounded-2xl glass-card border-white/5 bg-white/[0.02] overflow-hidden flex flex-col justify-between h-full space-y-6 transition-all duration-500 group-hover:border-white/20">
              <Scanline />

              <div className="flex justify-between items-start">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-700 shadow-xl",
                  method.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    method.color === 'blue' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                      "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                  <method.icon size={20} />
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/40 px-2 py-0.5 font-micro text-[7px] uppercase tracking-widest italic rounded-md">
                  {method.tag}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-heading font-black italic tracking-tighter text-white uppercase">{method.title}</h3>
                <p className="text-white/40 font-medium leading-normal text-xs">{method.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                <span className={cn("font-heading font-bold italic tracking-tight text-sm group-hover:text-white transition-colors",
                  method.color === 'emerald' ? "text-emerald-500/60" :
                    method.color === 'blue' ? "text-blue-500/60" :
                      "text-amber-500/60"
                )}>{method.value}</span>
                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Technical Concierge & Guides */}
      <div className="grid lg:grid-cols-2 gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="relative rounded-2xl overflow-hidden bg-obsidian-900 border border-white/5 p-6 flex flex-col justify-between group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.05] text-white">
                <HeadphonesIcon size={20} />
              </div>
              <h2 className="text-xl font-heading font-black italic uppercase tracking-tight text-white">{t("technicalConcierge")}</h2>
            </div>
            <p className="text-white/40 font-medium leading-normal max-w-md text-xs">
              {t("conciergeDesc")}
            </p>
          </div>

          <div className="space-y-4 mt-8 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="font-micro text-[8px] uppercase tracking-[0.3em] text-white/20 italic mb-1">{t("emailSupport")}</p>
                <p className="font-bold text-white tracking-wide text-xs">ops@dairyday.com</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="font-micro text-[8px] uppercase tracking-[0.3em] text-white/20 italic mb-1">{t("escalation")}</p>
                <p className="font-bold text-white tracking-wide text-xs">tech-lead@dairy.co</p>
              </div>
            </div>

            <Button
              className="w-full h-10 bg-white/[0.05] hover:bg-white hover:text-black text-white font-heading font-black italic uppercase tracking-wider gap-2 transition-all duration-500 rounded-xl border border-white/5 text-xs"
              onClick={() => window.location.href = "mailto:ops@dairyday.com"}
            >
              {t("emailDashboard")} <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/5 p-6 flex flex-col group"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-white/[0.05] text-white">
              <LifeBuoy size={20} />
            </div>
            <h2 className="text-xl font-heading font-black italic uppercase tracking-tight text-white">{t("operationalGuides")}</h2>
          </div>

          <div className="space-y-4 flex-1">
            {[
              t("guideExport"),
              t("guideBilling"),
              t("guidePermissions"),
              t("guideHardware")
            ].map((guide, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer flex items-center justify-between group/item"
              >
                <span className="font-bold text-white/60 group-hover/item:text-white transition-colors tracking-tight text-xs">{guide}</span>
                <ExternalLink className="h-3 w-3 text-white/20 group-hover/item:text-primary transition-all" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
