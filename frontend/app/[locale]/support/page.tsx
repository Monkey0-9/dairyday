'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Send, Mail, Phone, MapPin, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { supportApi } from '@/lib/api'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactFormValues = z.infer<typeof contactSchema>

export default function SupportPage() {
  useTranslations('Support')
  const [isSending, setIsSending] = useState(false)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  })

  async function onSubmit(data: ContactFormValues) {
    setIsSending(true)
    try {
      await supportApi.create(data)
      toast.success('Message sent! We will get back to you shortly.')
      form.reset()
    } catch (error) {
      console.error('Support error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="container max-w-6xl py-8 space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter text-gradient">
          How can we help you?
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We are here to support your dairy business 24/7.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid md:grid-cols-3 gap-6"
      >
        {/* Contact Info Cards */}
        <motion.div variants={itemVariants} className="md:col-span-1 space-y-6">
          <Card className="glass-card border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">support@dairyday.com</p>
              <p className="text-sm text-muted-foreground mt-1">Response time: &lt; 2 hours</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Call Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">+91 98765 43210</p>
              <p className="text-sm text-muted-foreground mt-1">Mon-Fri, 9am - 6pm IST</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Visit Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">123 Dairy Tech Park,<br/>Bangalore, India</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Form */}
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="glass border-border/50 shadow-2xl relative overflow-hidden">
             {/* Background decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
             
            <CardHeader>
              <CardTitle className="text-2xl">Send us a message</CardTitle>
              <CardDescription>
                Fill out the form below and our team will get back to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} className="bg-background/50" />
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
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="How can we help?" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us more about your inquiry..." 
                            className="min-h-[150px] bg-background/50 resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSending} className="w-full md:w-auto min-w-[150px] bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 transition-opacity">
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="space-y-6"
      >
        <div className="text-center">
            <h2 className="text-3xl font-bold font-heading">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2">Common questions about billing and delivery</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
            {[
                { q: "How do I change my subscription plan?", a: "You can view your current plan in your Profile settings. To upgrade, please contact our support team or use the 'Upgrade' button in your profile." },
                { q: "When is the bill generated?", a: "Bills are generated on the 1st of every month for the previous month's consumption." },
                { q: "How can I pause my milk delivery?", a: "Go to the Dashboard calendar, click on a future date, and select 'Cancel Delivery' or set quantity to 0." },
                { q: "Is online payment secure?", a: "Yes, we use Razorpay for secure and encrypted payment processing." }
            ].map((faq, index) => (
                <Card key={index} className="hover:border-primary/50 transition-colors cursor-default">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-start gap-2">
                            <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            {faq.q}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{faq.a}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </motion.div>
    </div>
  )
}
