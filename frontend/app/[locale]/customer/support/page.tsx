'use client'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Phone,
  MessageSquare,
  MessageCircle,
  Mail,
  Clock,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const SUPPORT_NUMBER = '+919980592787'

export default function CustomerSupportPage() {
  const t = useTranslations('Support')

  const contactMethods = [
    {
      title: t('voiceCall'),
      description: t('voiceCallDesc'),
      icon: Phone,
      value: '+91 99805 92787',
      action: () => window.open(`tel:${SUPPORT_NUMBER}`),
      color: 'bg-blue-500',
      tag: t('fastest')
    },
    {
      title: t('whatsapp'),
      description: t('whatsappDesc'),
      icon: MessageCircle,
      value: t('instantMessage'),
      action: () => window.open(`https://wa.me/${SUPPORT_NUMBER.replace('+', '')}`),
      color: 'bg-emerald-500',
      tag: t('preferred')
    },
    {
      title: t('sms'),
      description: t('smsDesc'),
      icon: MessageSquare,
      value: t('stdRatesApply'),
      action: () => window.open(`sms:${SUPPORT_NUMBER}`),
      color: 'bg-indigo-500',
      tag: t('direct')
    }
  ]

  const faqs = [
    {
      q: t('faq1Q'),
      a: t('faq1A')
    },
    {
      q: t('faq2Q'),
      a: t('faq2A')
    },
    {
      q: t('faq3Q'),
      a: t('faq3A')
    },
    {
      q: t('faq4Q'),
      a: t('faq4A')
    }
  ]

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/40 relative">
      {/* High-Fidelity Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[180px] rounded-full opacity-40 animate-pulse-glow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[150px] rounded-full opacity-30 animate-pulse-glow animation-delay-4000" />
      </div>

      <div className="container max-w-5xl mx-auto px-6 py-12 relative z-10 space-y-16">
        {/* Header Protocol */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 border-b border-border/10 pb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-primary animate-pulse" />
              <span className="font-micro text-primary tracking-[0.6em] uppercase">SYSTEM_HELPDESK_v4.2</span>
            </div>
            <h1 className="font-big text-foreground italic uppercase">Support <span className="text-gradient">Hub</span></h1>
          </div>
        </header>

        {/* Primary Contact Methods */}
        <div className="grid md:grid-cols-3 gap-10">
          {contactMethods.map((method, i) => (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card border-border/10 bg-background/40 backdrop-blur-3xl hover:border-primary/40 transition-all duration-700 cursor-pointer group h-full overflow-hidden relative rounded-[2.5rem]" onClick={method.action}>
                <div className={cn("absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity", method.color)} />
                <CardHeader className="pb-6 p-8">
                  <div className="flex justify-between items-start">
                    <div className={cn("p-4 rounded-2xl shadow-glass-elev text-foreground transition-all duration-700 group-hover:scale-110 group-hover:shadow-glow-primary/20", method.color.replace('bg-', 'bg-') + "/10")}>
                      <method.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="font-micro text-[10px] uppercase border-border/5 text-foreground/20 group-hover:text-primary transition-colors tracking-widest px-3 py-1">
                      {method.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mt-8 font-heading font-black italic uppercase tracking-tight text-foreground">{method.title}</CardTitle>
                  <CardDescription className="font-micro text-foreground/20 uppercase tracking-widest leading-relaxed mt-2">{method.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="flex items-center justify-between text-foreground/40 group-hover:text-foreground transition-all duration-700 border-t border-border/5 pt-6">
                    <span className="text-sm font-bold tracking-tight">{method.value}</span>
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-6 px-10 py-4 bg-foreground/[0.02] rounded-2xl border border-border/5">
              <HelpCircle className="h-5 w-5 text-primary" />
              <span className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('faqTitle')}</span>
              <div className="h-[1px] flex-1 bg-foreground/5" />
            </div>

            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <Card key={i} className="glass-card border-border/10 bg-background/40 hover:bg-foreground/[0.04] transition-all duration-700 rounded-2xl overflow-hidden group">
                  <CardHeader className="p-6 cursor-pointer">
                    <div className="flex items-center justify-between group">
                      <span className="font-heading font-bold italic text-lg text-foreground group-hover:text-primary transition-colors">{faq.q}</span>
                      <ChevronRight className="h-5 w-5 text-foreground/20 group-hover:text-foreground/60 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 text-sm text-foreground/40 leading-relaxed font-sans">
                    {faq.a}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Business Hours & Email */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-6 px-10 py-4 bg-foreground/[0.02] rounded-2xl border border-border/5">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-micro text-foreground/20 uppercase tracking-[0.4em]">{t('officeInfo')}</span>
              <div className="h-[1px] flex-1 bg-foreground/5" />
            </div>

            <Card className="glass-card border-border/10 bg-background/40 backdrop-blur-3xl relative overflow-hidden rounded-[2.5rem] p-4">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[100px] -z-10" />
              <CardHeader className="p-8">
                <CardTitle className="text-xl font-heading font-black italic uppercase text-foreground">{t('responseTimes')}</CardTitle>
                <CardDescription className="font-micro text-foreground/20 uppercase tracking-widest mt-2">{t('opsRun247')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8 pt-0">
                <div className="flex items-center justify-between py-4 border-b border-border/5">
                  <span className="font-micro text-foreground/20 uppercase tracking-widest">{t('criticalSupport')}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-micro tracking-widest italic">{t('availableNow')}</Badge>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-border/5">
                  <span className="font-micro text-foreground/20 uppercase tracking-widest">{t('billingHours')}</span>
                  <span className="text-lg font-heading font-black italic text-foreground/60">{t('officeHours')}</span>
                </div>
                <div className="pt-8">
                  <div className="flex items-center gap-6 mb-8 p-6 bg-foreground/[0.02] border border-border/5 rounded-2xl">
                    <div className="p-4 bg-foreground/5 rounded-xl text-primary shadow-glass-elev">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-micro text-foreground/20 uppercase tracking-widest text-[10px] mb-1">{t('emailUs')}</p>
                      <p className="text-lg font-heading font-black italic text-foreground tracking-tight">dairydaysdairydays@gmail.com</p>
                    </div>
                  </div>
                  <Button variant="outline" className="h-16 w-full rounded-2xl border-border/10 hover:bg-foreground hover:text-background font-heading font-black italic uppercase tracking-widest transition-all duration-700 gap-3" onClick={() => window.location.href = 'mailto:dairydaysdairydays@gmail.com'}>
                    {t('sendEmail')} <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Contact Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card border-border/10 bg-background/40 backdrop-blur-3xl overflow-hidden relative rounded-[3rem] p-6 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary opacity-50" />
            <CardHeader className="p-10">
              <CardTitle className="text-4xl font-black font-heading italic uppercase tracking-tighter text-foreground">{t('sendMessage')}</CardTitle>
              <CardDescription className="font-micro text-foreground/20 uppercase tracking-widest mt-2">{t('formDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <form className="grid gap-10 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="name" className="font-micro text-foreground/20 uppercase tracking-widest ml-2">{t('name')}</Label>
                  <Input id="name" placeholder={t('namePlaceholder')} className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="email" className="font-micro text-foreground/20 uppercase tracking-widest ml-2">{t('email')}</Label>
                  <Input id="email" type="email" placeholder={t('emailPlaceholder')} className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <Label htmlFor="subject" className="font-micro text-foreground/20 uppercase tracking-widest ml-2">{t('subject')}</Label>
                  <Input id="subject" placeholder={t('subjectPlaceholder')} className="h-16 bg-foreground/[0.02] border-border/5 rounded-2xl px-6 text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <Label htmlFor="message" className="font-micro text-foreground/20 uppercase tracking-widest ml-2">{t('message')}</Label>
                  <Textarea id="message" placeholder={t('messagePlaceholder')} className="min-h-[200px] bg-foreground/[0.02] border-border/5 rounded-3xl p-8 text-lg font-heading font-bold italic text-foreground focus:border-primary/40 focus:bg-foreground/[0.04] transition-all resize-none shadow-inner" />
                </div>
              </form>
            </CardContent>
            <CardFooter className="bg-foreground/[0.02] border-t border-border/5 p-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="font-micro text-foreground/20 uppercase tracking-widest flex items-center gap-4 text-xs">
                <ShieldAlert className="h-4 w-4 text-primary" /> {t('opsSupport')}
              </p>
              <Button className="h-20 px-16 rounded-[2rem] bg-foreground text-background hover:bg-primary hover:text-white font-heading font-black tracking-tighter italic text-2xl gap-6 transition-all duration-700 shadow-2xl group">
                <Zap size={24} className="group-hover:fill-current transition-all" />
                {t('sendButton').toUpperCase()}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Background Ambience */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06] overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-foreground/10" />
          <div className="absolute top-0 left-3/4 w-[1px] h-full bg-foreground/10" />
          <div className="absolute top-1/4 left-0 w-full h-[1px] bg-foreground/10" />
          <div className="absolute top-3/4 left-0 w-full h-[1px] bg-foreground/10" />
        </div>
      </div>
    </div>
  )
}
