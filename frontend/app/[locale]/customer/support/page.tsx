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
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const SUPPORT_NUMBER = '+919980592787'

export default function CustomerSupportPage() {
  useTranslations('Support')

  const contactMethods = [
    {
      title: 'Voice Call',
      description: 'Direct line to our support desk',
      icon: Phone,
      value: '+91 99805 92787',
      action: () => window.open(`tel:${SUPPORT_NUMBER}`),
      color: 'bg-blue-500',
      tag: 'Fastest'
    },
    {
      title: 'WhatsApp',
      description: 'Chat with us instantly',
      icon: MessageCircle,
      value: 'Instant Message',
      action: () => window.open(`https://wa.me/${SUPPORT_NUMBER.replace('+', '')}`),
      color: 'bg-emerald-500',
      tag: 'Preferred'
    },
    {
      title: 'SMS Support',
      description: 'Send us a text message',
      icon: MessageSquare,
      value: 'Standard Rates Apply',
      action: () => window.open(`sms:${SUPPORT_NUMBER}`),
      color: 'bg-indigo-500',
      tag: 'Direct'
    }
  ]

  const faqs = [
    {
      q: "How to cancel for today?",
      a: "Go to Calendar, click today's date, and use the 'Cancel Delivery' toggle. Must be done before 6 AM."
    },
    {
      q: "When is my bill generated?",
      a: "Bills are generated on the 1st of every month for the previous month's usage."
    },
    {
      q: "How to add extra milk?",
      a: "Select tomorrow in the calendar and increase the quantity. Admins will confirm your request."
    },
    {
      q: "Payment hasn't reflected?",
      a: "Manual UPI payments are verified by our staff within 12-24 hours. Check back tomorrow!"
    }
  ]

  return (
    <div className="container max-w-5xl py-8 space-y-10 text-foreground">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-black tracking-tight text-gradient">Support Center</h1>
        <p className="text-foreground/40 font-medium">We&apos;re here to help you 24/7 with your dairy needs.</p>
      </motion.div>

      {/* Primary Contact Methods */}
      <div className="grid md:grid-cols-3 gap-6">
        {contactMethods.map((method, i) => (
          <motion.div
            key={method.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card border-border/10 bg-background/50 dark:bg-black/50 hover:border-primary/40 transition-all cursor-pointer group h-full overflow-hidden relative" onClick={method.action}>
              <div className={`absolute top-0 left-0 w-1 h-full ${method.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl ${method.color}/20 text-foreground`}>
                    <method.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase border-border/10 text-foreground/40 group-hover:text-foreground transition-colors">
                    {method.tag}
                  </Badge>
                </div>
                <CardTitle className="text-xl mt-4 text-foreground">{method.title}</CardTitle>
                <CardDescription className="text-muted-foreground">{method.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-foreground/60 group-hover:text-foreground transition-colors">
                  <span className="text-sm font-semibold">{method.value}</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Frequently Asked</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} className="glass-card border-border/5 bg-foreground/[0.02]">
                <CardHeader className="p-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors">
                  <div className="flex items-center justify-between group">
                    <span className="font-semibold text-sm text-foreground">{faq.q}</span>
                    <ChevronRight className="h-4 w-4 text-foreground/20 group-hover:text-foreground/60 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-foreground/40 leading-relaxed">
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
          className="space-y-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Office Info</h2>
          </div>

          <Card className="glass-card border-border/10 bg-background/50 dark:bg-black/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Response Times</CardTitle>
              <CardDescription className="text-muted-foreground">Our operations run 24/7 for delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/40">Critical Support</span>
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Available Now</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/40">Billing Hours</span>
                <span className="text-sm font-medium text-foreground">9 AM - 6 PM IST</span>
              </div>
              <div className="pt-4 border-t border-border/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-foreground/5 rounded-lg">
                    <Mail className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-foreground/20">Email Us</p>
                    <p className="text-sm font-medium text-foreground">support@dairyday.com</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-border/10 hover:bg-foreground/5 text-foreground" onClick={() => window.location.href = 'mailto:support@dairyday.com'}>
                  Send Email <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
