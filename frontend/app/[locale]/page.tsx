'use client';

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Milk,
  ArrowRight,
  ShieldCheck,
  Zap,
  LayoutGrid,
  Menu,
  Droplets,
  Clock,
  MapPin,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AIAssistant } from "@/components/ai-assistant";

const FeatureCard = ({ title, desc, icon, delay = 0 }: { title: string, desc: string, icon: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8 }}
    className="group relative p-10 rounded-[2.5rem] glass-card"
  >
    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-glow-primary hover:shadow-glow-intense">
      {icon}
    </div>
    <h3 className="text-2xl font-heading font-black tracking-tight mb-4 text-foreground uppercase italic">{title}</h3>
    <p className="text-muted-foreground font-medium leading-relaxed">{desc}</p>
  </motion.div>
);

const LightLeak = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 0.6, scale: 1 }}
      transition={{ duration: 3, ease: "easeOut" }}
      className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-amber-500/20 blur-[120px] mix-blend-screen"
    />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      transition={{ duration: 4, delay: 1 }}
      className="absolute top-[30%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-blue-500/20 blur-[150px] mix-blend-screen"
    />
  </div>
);

const FloatingGlassPill = ({ delay, top, left, right, label, icon: Icon }: { delay: number; top?: string; left?: string; right?: string; label: string; icon: React.ElementType }) => (
  <motion.div
    initial={{ y: 20, opacity: 0, rotate: -2 }}
    animate={{ y: [0, -15, 0], opacity: 1, rotate: [-2, 2, -2] }}
    transition={{ 
      y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay }, 
      opacity: { duration: 1, delay },
      rotate: { duration: 8, repeat: Infinity, ease: "easeInOut", delay }
    }}
    style={{ top, left, right }}
    className="absolute hidden lg:flex items-center gap-3 p-2.5 pr-6 rounded-full glass-card border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-20 hover:bg-white/[0.08] transition-colors"
  >
    <div className="p-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
      <Icon size={14} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">{label}</span>
  </motion.div>
);

export default function LandingPage() {
  const tHero = useTranslations('Landing.hero');
  const tFeatures = useTranslations('Landing.features');
  const tNav = useTranslations('Landing.nav');
  
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div ref={containerRef} className="min-h-screen bg-transparent selection:bg-primary/20 overflow-x-hidden">
      {/* Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] h-24 flex items-center">
        <div className="absolute inset-0 bg-background/40 backdrop-blur-2xl border-b border-border/50" />
        <div className="container mx-auto px-6 flex items-center justify-between relative z-10 touch-target-auto">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="p-2.5 rounded-2xl bg-primary shadow-glow-primary group-hover:rotate-12 transition-transform duration-500">
              <Milk className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-2xl tracking-tighter text-foreground italic uppercase leading-none">DairyDays</span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase mt-1">Heritage Quality</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-12">
            <nav className="flex items-center gap-10">
              {['features', 'market', 'security', 'infrastructure'].map(key => (
                <Link key={key} href="#" className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 hover:text-amber-600 transition-colors">
                  {tNav(key)}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <Button asChild variant="glow" size="lg" className="h-12 px-8 rounded-full font-bold italic">
                <Link href="/login">Customer Portal</Link>
              </Button>
            </div>
          </div>

          <div className="lg:hidden flex items-center gap-4">
             <LanguageSwitcher />
             <ThemeToggle />
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-slate-200 dark:border-white/10">
                   <Menu className="h-6 w-6" />
                 </Button>
               </SheetTrigger>
               <SheetContent className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-white/10">
                 <div className="pt-12 flex flex-col gap-6">
                    {['Signature Collection', 'The Farm', 'Quality Control', 'Daily Fresh'].map(item => (
                      <Link key={item} href="#" className="text-xl font-heading font-black uppercase italic text-slate-900 dark:text-white hover:text-amber-500">
                        {item}
                      </Link>
                    ))}
                    <Button asChild className="h-14 rounded-2xl bg-amber-500 text-white font-bold italic text-lg mt-8">
                      <Link href="/login">Enter Portal</Link>
                    </Button>
                 </div>
               </SheetContent>
             </Sheet>
          </div>
        </div>
      </header>

      <main>
        {/* Cinematic Hero */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <motion.div style={{ y: backgroundY }} className="absolute inset-0">
            <Image 
              src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2074&auto=format&fit=crop" 
              alt="Premium Dairy Farm" 
              fill 
              priority
              className="object-cover scale-110 brightness-[0.85] dark:brightness-[0.6]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          </motion.div>

          <LightLeak />
          <FloatingGlassPill delay={0.2} top="25%" left="15%" label="Sunrise Fresh" icon={Milk} />
          <FloatingGlassPill delay={0.8} top="65%" left="20%" label="A2 Certified" icon={ShieldCheck} />
          <FloatingGlassPill delay={1.4} top="35%" right="15%" label="Zero Preservatives" icon={Droplets} />
          <FloatingGlassPill delay={2.0} top="75%" right="25%" label="Before 7 AM" icon={Clock} />

          <div className="container px-6 mx-auto relative z-10 text-center mt-20">
            <motion.div
              style={{ y: textY }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block px-6 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white text-xs font-bold uppercase tracking-[0.4em] mb-8 shadow-2xl">
                {tHero('tagline')}
              </span>
              <h1 className="text-[3.5rem] sm:text-7xl lg:text-[10rem] font-heading font-black text-white italic leading-[0.85] sm:leading-[0.8] mb-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {tHero('title')} <span className="text-gradient block sm:inline">{tHero('titleHighlight')}</span>
              </h1>
              <p className="max-w-2xl mx-auto text-white/80 text-lg md:text-2xl font-medium tracking-wide mb-16 drop-shadow-lg">
                {tHero('subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <Button asChild variant="glow" size="xl" className="rounded-3xl hover-lift group relative overflow-hidden">
                  <Link href="/login" className="flex items-center gap-4 relative z-10 w-full justify-center">
                    {tHero('initialize')} <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform duration-500" />
                  </Link>
                </Button>
                <Button variant="glass" size="xl" asChild className="rounded-3xl hover-lift">
                  <Link href="#collection" className="w-full justify-center">{tHero('status')}</Link>
                </Button>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          >
            <span className="text-white/40 text-[10px] uppercase tracking-[0.5em] font-bold italic">Scroll to Discover</span>
            <div className="w-px h-16 bg-gradient-to-b from-amber-500 to-transparent" />
          </motion.div>
        </section>

        {/* Quality Showcase Section */}
        <section id="collection" className="py-40 relative">
          <div className="container px-6 mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl group"
              >
                <Image src="https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=1887&auto=format&fit=crop" alt="Pure Milk Pouring" fill className="object-cover group-hover:scale-110 transition-transform duration-[3s]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                   <span className="text-amber-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">{tFeatures('core')}</span>
                   <h3 className="text-4xl font-heading font-black text-white uppercase italic leading-tight">{tFeatures('realtimeTitle')}</h3>
                </div>
              </motion.div>
              
              <div>
                <span className="text-primary text-sm font-black tracking-[0.4em] uppercase mb-6 block">{tFeatures('core')}</span>
                <h2 className="text-5xl md:text-7xl font-heading font-black text-foreground uppercase italic leading-[0.9] mb-12">
                  {tFeatures('mainTitle')}
                </h2>
                <div className="space-y-12">
                  {[
                    { 
                      icon: <ShieldCheck className="w-8 h-8" />, 
                      title: tFeatures('securityTitle'), 
                      desc: tFeatures('securityDesc') 
                    },
                    { 
                      icon: <Clock className="w-8 h-8" />, 
                      title: tFeatures('autoSettlement.title'), 
                      desc: tFeatures('autoSettlement.desc') 
                    },
                    { 
                      icon: <MapPin className="w-8 h-8" />, 
                      title: tFeatures('mobileSecure.title'), 
                      desc: tFeatures('mobileSecure.desc') 
                    }
                  ].map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.2 }}
                      className="flex gap-8 group"
                    >
                      <div className="flex-shrink-0 w-16 h-16 rounded-[1.5rem] bg-card border border-border flex items-center justify-center text-primary shadow-glow-sm hover:shadow-glow-intense group-hover:bg-primary group-hover:text-white transition-all duration-500 outline outline-transparent outline-offset-2 focus-visible:outline-primary touch-target-auto">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xl font-heading font-black text-foreground uppercase italic mb-2 tracking-tight">{item.title}</h4>
                        <p className="text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-40 bg-card/10 relative">
          <div className="container px-6 mx-auto text-center mb-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-6xl md:text-8xl font-heading font-black text-foreground uppercase italic tracking-tighter mb-8">
                {tFeatures('titleHighlight')}
              </h2>
              <div className="w-24 h-1.5 bg-primary mx-auto rounded-full shadow-glow-primary" />
            </motion.div>
          </div>

          <div className="container px-6 mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title={tFeatures('realtimeTitle')}
              desc={tFeatures('realtimeDesc')}
              delay={0.1}
            />
            <FeatureCard
              icon={<Droplets className="w-8 h-8" />}
              title={tFeatures('intelligentEntry.title')}
              desc={tFeatures('intelligentEntry.desc')}
              delay={0.2}
            />
            <FeatureCard
              icon={<LayoutGrid className="w-8 h-8" />}
              title={tFeatures('dashboardTitle')}
              desc={tFeatures('dashboardDesc')}
              delay={0.3}
            />
          </div>
        </section>

        {/* Banner Section */}
        <section className="relative h-[60vh] flex items-center overflow-hidden">
          <Image src="https://images.unsplash.com/photo-1628088062854-e910ecfb976d?q=80&w=2070&auto=format&fit=crop" alt="Premium Products" fill className="object-cover brightness-[0.7]" />
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="container px-6 mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
               <h2 className="text-5xl md:text-7xl font-heading font-black text-white uppercase italic leading-none mb-12">
                 THE FINEST SELECTION<br />FOR YOUR FAMILY
               </h2>
                <Button variant="glow" asChild size="xl" className="rounded-[2rem] hover-lift">
                  <Link href="/login">Secure Your Daily Supply</Link>
                </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="pt-40 pb-20 border-t border-border/50 bg-background/80 backdrop-blur-3xl">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-20 mb-32">
            <div className="max-w-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-2 rounded-xl bg-primary shadow-glow-primary">
                  <Milk className="h-6 w-6 text-white" />
                </div>
                <span className="font-heading font-black text-3xl tracking-tighter italic uppercase">DairyDays</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                Pioneering the modern dairy experience. We combine 40 years of heritage with state-of-the-art logistics.
              </p>
              <div className="flex gap-4">
                 {[1,2,3,4].map(idx => (
                   <div key={idx} className="w-10 h-10 rounded-xl bg-card border border-border hover:border-primary transition-colors hover:shadow-glow-sm" />
                 ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
              {[
                { title: "COLLECTION", links: ["Cow Milk", "A2 Premium", "Buffalo Rich", "Organic Farm"] },
                { title: "COMPANY", links: ["Our Story", "The Farms", "Quality Control", "Careers"] },
                { title: "SUPPORT", links: ["FAQ", "Contact Us", "Delivery Area", "Payment Info"] }
              ].map(group => (
                <div key={group.title}>
                  <h5 className="font-black text-xs tracking-[0.3em] uppercase mb-8 text-slate-400">{group.title}</h5>
                  <ul className="space-y-4">
                    {group.links.map(link => (
                      <li key={link}>
                        <Link href="#" className="font-bold text-sm text-muted-foreground hover:text-primary transition-colors uppercase italic tracking-tight">{link}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-20 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
             <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-400">
               © 2026 DairyDays Heritage. All Rights Reserved.
             </p>
             <div className="flex items-center gap-12">
               <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600"><Star className="w-3 h-3 fill-amber-600" /> 4.9/5 RATED SERVICE</span>
               <div className="flex gap-8">
                 {['Terms of Service', 'Privacy Policy'].map(item => (
                   <Link key={item} href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{item}</Link>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
}
