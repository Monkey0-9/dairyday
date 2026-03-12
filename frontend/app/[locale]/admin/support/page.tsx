"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Send, Mail, Phone, MapPin, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { supportApi } from "@/lib/api"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

type ContactFormValues = z.infer<typeof contactSchema>

export default function SupportPage() {
  const [isSending, setIsSending] = useState(false)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  })

  async function onSubmit(data: ContactFormValues) {
    setIsSending(true)
    try {
      await supportApi.create(data)
      toast.success("Message sent! A support agent will contact you shortly.")
      form.reset()
    } catch (error) {
      toast.error("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground relative pb-20">
      {/* High-Fidelity Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full opacity-30 animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[180px] rounded-full opacity-40 animate-pulse-glow animation-delay-4000" />
      </div>

      <div className="container max-w-6xl mx-auto px-6 py-12 relative z-10 space-y-16">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-4">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">SUPPORT_HUB_v2</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter italic uppercase text-white">
            How can we <span className="text-gradient">help?</span>
          </h1>
          <p className="text-white/40 max-w-2xl font-medium tracking-wide">
            Our elite support team is standing by to assist with your dairy operations, billing, or any technical inquiries.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card rounded-[2rem] p-8 border border-white/5 bg-foreground/[0.02] relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 shadow-glow-primary/5">
                <Phone size={24} />
              </div>
              <h3 className="text-xl font-heading font-black italic uppercase tracking-tight text-white mb-2">Direct Line</h3>
              <p className="font-mono text-lg text-white/80">+91 99805 92787</p>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-4">24/7 Priority Support</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-card rounded-[2rem] p-8 border border-white/5 bg-foreground/[0.02] relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 shadow-glow-blue/5">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-heading font-black italic uppercase tracking-tight text-white mb-2">Email Desk</h3>
              <p className="font-mono text-sm text-white/80 break-all">dairydaysdairydays@gmail.com</p>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-4">Average Response &lt; 2h</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass-card rounded-[2rem] p-8 border border-white/5 bg-foreground/[0.02] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-glow-emerald/5">
                <MapPin size={24} />
              </div>
              <h3 className="text-xl font-heading font-black italic uppercase tracking-tight text-white mb-2">Headquarters</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Elite Dairy Tech Park<br/>Bangalore, India
              </p>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass-card rounded-[2.5rem] p-8 sm:p-12 border border-white/5 bg-foreground/[0.02] relative overflow-hidden">
            
            <div className="flex items-center gap-4 pb-8 mb-8 border-b border-white/5 relative z-10">
              <div>
                <h2 className="text-2xl font-heading font-black italic uppercase tracking-tight text-white">Create Ticket</h2>
                <p className="font-micro text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1">Submit a secure inquiry to the operations team</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="font-micro text-[9px] text-white/30 uppercase tracking-[0.3em] ml-2">Transmitting Entity</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Name" {...field} className="h-14 bg-white/[0.02] border-white/5 rounded-2xl px-6 font-heading font-bold italic text-white focus:border-primary/40 focus:bg-white/[0.04] transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="font-micro text-[9px] text-white/30 uppercase tracking-[0.3em] ml-2">Return Address</FormLabel>
                        <FormControl>
                          <Input placeholder="your.email@domain.com" {...field} className="h-14 bg-white/[0.02] border-white/5 rounded-2xl px-6 font-heading font-bold italic text-white focus:border-primary/40 focus:bg-white/[0.04] transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-micro text-[9px] text-white/30 uppercase tracking-[0.3em] ml-2">Transmission Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Billing Issue, Delivery Update, etc." {...field} className="h-14 bg-white/[0.02] border-white/5 rounded-2xl px-6 font-heading font-bold italic text-white focus:border-primary/40 focus:bg-white/[0.04] transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-micro text-[9px] text-white/30 uppercase tracking-[0.3em] ml-2">Payload / Inquiry</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe your issue in detail so our agents can resolve it efficiently..."
                          className="min-h-[160px] bg-white/[0.02] border-white/5 rounded-2xl p-6 font-medium text-white focus:border-primary/40 focus:bg-white/[0.04] transition-all resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSending} className="w-full h-16 rounded-[2rem] bg-white text-black hover:bg-primary hover:text-white font-heading font-black tracking-widest italic text-lg gap-4 transition-all duration-500 shadow-2xl group border border-transparent">
                  {isSending ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      TRANSMITTING...
                    </>
                  ) : (
                    <>
                      <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      DISPATCH SECURE TICKET
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
