'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { 
  Milk, ArrowRight, ShieldCheck, Zap, Smartphone, 
  FileText, Users, Calendar, BarChart3, CheckCircle2,
  Lock, TrendingUp, ChevronRight, ChevronDown, Star,
  ClipboardList, Receipt, CreditCard
} from 'lucide-react'

/* ── Animated Counter Hook ── */
function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!startOnView) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration, startOnView])

  return { count, ref }
}

/* ── FAQ Item Component ── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-base md:text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-slate-500 transition-transform duration-300 flex-shrink-0 ${open ? 'rotate-180 text-indigo-400' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-6' : 'max-h-0'}`}
      >
        <p className="text-slate-400 leading-relaxed text-sm md:text-base">{answer}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  /* Animated stat counters */
  const dairies = useCountUp(500)
  const customers = useCountUp(50000)
  const processed = useCountUp(2)

  return (
    <div className="flex flex-col min-h-screen bg-[#000000] text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      
      {/* Background Ambience - Optimized */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-900/20 rounded-full blur-[80px] animate-pulse duration-[12s] will-change-transform opacity-60" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-900/10 rounded-full blur-[80px] animate-pulse duration-[15s] will-change-transform opacity-60" />
        <div className="absolute top-[40%] left-[20%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px] animate-pulse duration-[18s] will-change-transform opacity-30" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] mix-blend-overlay" />
      </div>

      {/* ════════════════════════════
          NAVBAR
          ════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 lg:px-12 flex items-center justify-between">
          <Link className="flex items-center gap-2 group" href="/">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <Milk className="relative h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">DairyDay</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/trends" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              <Zap className="h-3 w-3" /> 2026 Trends
            </Link>
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Reviews</a>
            <a href="#faq" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              Login
            </Link>
            <Button 
              asChild
              className="h-9 px-5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-[0_0_16px_-4px_rgba(79,70,229,0.5)] hover:shadow-[0_0_24px_-4px_rgba(79,70,229,0.6)] hover:scale-105 transition-all duration-300"
            >
              <Link href="/login">
                Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">

        {/* ════════════════════════════
            HERO SECTION
            ════════════════════════════ */}
        <section className="flex flex-col items-center justify-center text-center pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
          <div className="container mx-auto max-w-5xl flex flex-col items-center space-y-10">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
               <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
               <span className="text-xs font-medium text-indigo-200 tracking-wide">SYSTEM LIVE 2026</span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-bold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] animate-in fade-in zoom-in-95 duration-1000 delay-100">
              DairyDay
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-slate-400 max-w-3xl leading-relaxed font-light tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Smart Daily Milk Tracking <span className="text-indigo-500 mx-2">•</span> Automatic Billing <span className="text-indigo-500 mx-2">•</span> Instant Razorpay Payments
              <br />
              <span className="text-slate-500 text-base mt-2 block">Built for real Indian dairies — simple, fast, and dispute-free.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-5 w-full justify-center pt-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Button 
                asChild 
                className="h-14 px-10 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] text-white text-lg font-semibold shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.6)] hover:scale-105 transition-all duration-300 animate-shimmer"
              >
                <Link href="/login">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                className="h-14 px-10 rounded-full border-white/10 bg-white/5 text-white text-lg font-medium hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300 backdrop-blur-sm"
              >
                <Link href="/login">
                  View Demo
                </Link>
              </Button>
            </div>

            {/* ── Animated Stats Bar ── */}
            <div className="pt-16 grid grid-cols-3 gap-8 md:gap-16 max-w-2xl w-full animate-in fade-in duration-1000 delay-500">
              <div ref={dairies.ref} className="text-center">
                <div className="text-3xl md:text-4xl font-black tracking-tight text-white tabular-nums">
                  {dairies.count}+
                </div>
                <div className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">
                  Dairies
                </div>
              </div>
              <div ref={customers.ref} className="text-center">
                <div className="text-3xl md:text-4xl font-black tracking-tight text-white tabular-nums">
                  {customers.count >= 1000 ? `${Math.floor(customers.count / 1000)}K` : customers.count}+
                </div>
                <div className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">
                  Customers
                </div>
              </div>
              <div ref={processed.ref} className="text-center">
                <div className="text-3xl md:text-4xl font-black tracking-tight text-white tabular-nums">
                  ₹{processed.count}Cr+
                </div>
                <div className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">
                  Processed
                </div>
              </div>
            </div>

            {/* Trust Icons */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-60">
               <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs md:text-sm font-medium text-slate-300 uppercase tracking-wider">Secured by Razorpay</span>
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-700 hidden md:block" />
               <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-xs md:text-sm font-medium text-slate-300 uppercase tracking-wider">100% UPI Ready</span>
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-700 hidden md:block" />
               <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs md:text-sm font-medium text-slate-300 uppercase tracking-wider">End-to-End Encrypted</span>
               </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════
            HOW IT WORKS — 3 Steps
            ════════════════════════════ */}
        <section id="how-it-works" className="relative py-24 lg:py-32 px-6">
          <div className="container mx-auto max-w-5xl">
            
            <div className="text-center mb-16 lg:mb-20">
              <span className="inline-block text-xs font-bold text-indigo-400 uppercase tracking-[0.25em] mb-4">
                How It Works
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Three steps. Zero headaches.
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                From daily milk collection to monthly payments — everything runs automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: "01",
                  icon: ClipboardList,
                  title: "Record Daily Entry",
                  desc: "Enter milk quantity, fat, and SNF in seconds. Morning and evening — that's it.",
                  color: "from-blue-500 to-cyan-500",
                  glow: "rgba(59,130,246,0.15)",
                },
                {
                  step: "02",
                  icon: Receipt,
                  title: "Auto-Generate Bills",
                  desc: "At month-end, bills are calculated and generated automatically. No spreadsheets.",
                  color: "from-violet-500 to-purple-500",
                  glow: "rgba(139,92,246,0.15)",
                },
                {
                  step: "03",
                  icon: CreditCard,
                  title: "Collect Payments",
                  desc: "Customers pay via UPI, cards, or netbanking through secure Razorpay checkout.",
                  color: "from-emerald-500 to-green-500",
                  glow: "rgba(16,185,129,0.15)",
                },
              ].map((item) => (
                <div key={item.step} className="relative group">
                  {/* Step number */}
                  <div className="text-7xl md:text-8xl font-black text-white/[0.03] absolute -top-4 -left-2 select-none pointer-events-none">
                    {item.step}
                  </div>
                  
                  <div className="relative z-10">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      style={{ boxShadow: `0 8px 32px ${item.glow}` }}
                    >
                      <item.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-sm font-light">
                      {item.desc}
                    </p>
                  </div>

                  {/* Connector line (hidden on mobile, visible between steps) */}
                  {item.step !== "03" && (
                    <div className="hidden md:block absolute top-7 -right-6 lg:-right-6 w-12 lg:w-12">
                      <div className="h-px bg-gradient-to-r from-slate-700 to-transparent" />
                      <ChevronRight className="h-4 w-4 text-slate-700 absolute -right-1 -top-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════
            FEATURE CARDS
            ════════════════════════════ */}
        <section id="features" className="relative py-24 lg:py-32 px-6">
          <div className="container mx-auto max-w-6xl">
            
            <div className="text-center mb-16 lg:mb-20">
              <span className="inline-block text-xs font-bold text-indigo-400 uppercase tracking-[0.25em] mb-4">
                Features
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Everything your dairy needs
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Built by someone who understands the dairy business. No unnecessary complexity.
              </p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[
                 { title: "Daily Entry", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10", spotlight: "rgba(59,130,246,0.15)", desc: "Fastest daily milk collection entry. Record fat, SNF, and quantity in seconds." },
                 { title: "Monthly Billing", icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10", spotlight: "rgba(139,92,246,0.15)", desc: "Automated bill generation at month-end. Zero manual calculation errors." },
                 { title: "Customer Portal", icon: Smartphone, color: "text-emerald-400", bg: "bg-emerald-500/10", spotlight: "rgba(16,185,129,0.15)", desc: "Customers can view their own live data and history on mobile instantly." },
                 { title: "Instant Payments", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", spotlight: "rgba(245,158,11,0.15)", desc: "Integrated Razorpay secure checkout. Accept UPI, Cards, and Netbanking." },
                 { title: "Reports & Export", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10", spotlight: "rgba(6,182,212,0.15)", desc: "Comprehensive PDF/Excel reports for complete business analytics." },
                 { title: "Data Security", icon: Lock, color: "text-rose-400", bg: "bg-rose-500/10", spotlight: "rgba(244,63,94,0.15)", desc: "Enterprise-grade encryption and daily cloud backups. Your data is safe." }
               ].map((feature) => (
                 <SpotlightCard 
                   key={feature.title}
                   className="p-8 backdrop-blur-md"
                   spotlightColor={feature.spotlight}
                 >
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${feature.bg} ${feature.color} ring-1 ring-inset ring-white/5 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">{feature.title}</h3>
                   <p className="text-slate-400 leading-relaxed text-sm font-light">
                     {feature.desc}
                   </p>
                 </SpotlightCard>
               ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════
            2026 TRENDS TEASER
            ════════════════════════════ */}
        <section className="relative py-24 px-6 border-y border-white/5 bg-white/[0.01]">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
               <div className="text-left">
                  <span className="inline-block text-xs font-bold text-indigo-400 uppercase tracking-[0.25em] mb-4">
                    Innovation
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-2">
                    Future-Ready Design
                  </h2>
                  <p className="text-slate-400 text-lg max-w-xl">
                    Explore the cutting-edge web design trends powering DairyDay.
                  </p>
               </div>
               <Button asChild className="h-12 px-6 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 shrink-0">
                  <Link href="/trends">View Showcase <ArrowRight className="ml-2 h-4 w-4" /></Link>
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "AI Integration", desc: "Smart automation & predictions", color: "from-indigo-500/20 to-purple-500/20", spotlight: "rgba(168,85,247,0.3)" },
                { title: "Human-Centric", desc: "Emotionally resonant UI", color: "from-rose-500/20 to-orange-500/20", spotlight: "rgba(244,63,94,0.3)" },
                { title: "Immersive UX", desc: "Cinematic interactions", color: "from-emerald-500/20 to-teal-500/20", spotlight: "rgba(16,185,129,0.3)" }
              ].map((item, i) => (
                <SpotlightCard 
                  key={i} 
                  clickable 
                  className="h-48 border-white/10"
                  spotlightColor={item.spotlight}
                >
                   <Link href="/trends" className="absolute inset-0 flex flex-col h-full w-full">
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                          <h3 className="text-2xl font-bold text-white mb-2 dropdown-shadow">{item.title}</h3>
                          <p className="text-sm text-slate-300">{item.desc}</p>
                      </div>
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20">
                          <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                            <ArrowRight className="h-4 w-4 text-white" />
                          </div>
                      </div>
                   </Link>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════
            TESTIMONIALS
            ════════════════════════════ */}
        <section id="testimonials" className="relative py-24 lg:py-32 px-6">
          <div className="container mx-auto max-w-6xl">
            
            <div className="text-center mb-16 lg:mb-20">
              <span className="inline-block text-xs font-bold text-indigo-400 uppercase tracking-[0.25em] mb-4">
                Testimonials
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Loved by dairy owners
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Real feedback from real dairy businesses across India.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Rajesh Kumar",
                  role: "Krishna Dairy, Bangalore",
                  text: "We used to spend 3 hours on billing every month. Now it's done in 5 minutes. DairyDay saved our business.",
                  avatar: "RK",
                  gradient: "from-indigo-500 to-violet-600",
                },
                {
                  name: "Sunita Patel",
                  role: "Shree Dairy, Ahmedabad",
                  text: "My customers love the portal — they check their own records, no more phone calls asking about balances. Disputes went to zero.",
                  avatar: "SP",
                  gradient: "from-emerald-500 to-teal-600",
                },
                {
                  name: "Manoj Sharma",
                  role: "Gau Seva Dairy, Jaipur",
                  text: "UPI payments through Razorpay changed everything. Collections improved by 40% in the first month itself.",
                  avatar: "MS",
                  gradient: "from-amber-500 to-orange-600",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="relative p-8 rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 hover:-translate-y-1 group"
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array(5).fill(0).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-6 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-lg ring-1 ring-white/10`}>
                      <span className="text-xs font-bold text-white">{t.avatar}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════
            FAQ SECTION
            ════════════════════════════ */}
        <section id="faq" className="relative py-24 lg:py-32 px-6">
          <div className="container mx-auto max-w-3xl">
            
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold text-indigo-400 uppercase tracking-[0.25em] mb-4">
                FAQ
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Questions? Answers.
              </h2>
            </div>

            <div className="rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-6 md:p-8">
              <FAQItem
                question="Is DairyDay free to get started?"
                answer="Yes! There's no setup fee. You can start using DairyDay immediately after creating an account. We only charge a small transaction fee when customers make payments through Razorpay."
              />
              <FAQItem
                question="Is my data safe?"
                answer="Absolutely. All data is encrypted end-to-end and backed up daily to cloud servers. We use the same security standards as banks. Your dairy records are yours — we never share or sell data."
              />
              <FAQItem
                question="Can my customers use it on their phones?"
                answer="Yes! Customers get their own portal that works perfectly on any smartphone browser. They can check their daily records, monthly bills, and make payments — all from their phone."
              />
              <FAQItem
                question="How do I migrate from my current system?"
                answer="We help you import your existing customer data for free. Most dairies are up and running within 24 hours. Our team will guide you through every step of the migration process."
              />
            </div>
          </div>
        </section>

        {/* ════════════════════════════
            BOTTOM CTA
            ════════════════════════════ */}
        <section className="relative py-24 lg:py-32 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="p-12 rounded-[3rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/[0.05] relative overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 bg-indigo-500/10 blur-[100px] rounded-full" />
               
               <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight relative z-10">
                 Start your automated dairy today.
               </h2>
               <p className="text-slate-400 mb-4 text-lg relative z-10">
                 Join 500+ modern dairy owners scaling their business.
               </p>
               
               {/* Social proof near final CTA */}
               <div className="flex items-center justify-center gap-4 mb-8 relative z-10">
                 <div className="flex -space-x-2">
                   {["RK", "SP", "MS", "AV"].map((initials) => (
                     <div key={initials} className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-2 ring-black text-[10px] font-bold text-white">
                       {initials}
                     </div>
                   ))}
                 </div>
                 <div className="flex items-center gap-1">
                   {Array(5).fill(0).map((_, i) => (
                     <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                   ))}
                   <span className="text-xs text-slate-400 ml-1">4.9/5</span>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                 <Button asChild className="h-12 px-8 rounded-full bg-white text-black hover:bg-slate-200 transition-colors font-bold">
                    <Link href="/login">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                 </Button>
                 <Button asChild variant="outline" className="h-12 px-8 rounded-full border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 hover:border-white/20 hover:text-white transition-all backdrop-blur-sm">
                    <Link href="/login">Watch 2-Min Demo</Link>
                 </Button>
               </div>
            </div>
          </div>
        </section>

      </main>

      {/* ════════════════════════════
          FOOTER
          ════════════════════════════ */}
      <footer className="w-full border-t border-white/5 py-12 relative z-10 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
               <Milk className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">DairyDay</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
            <a href="#features" className="hover:text-slate-400 transition-colors">Features</a>
            <a href="#faq" className="hover:text-slate-400 transition-colors">FAQ</a>
            <span>© 2026 DairyDay. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
