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
    className="group relative p-10 rounded-[2.5rem] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-amber-500/30 transition-all duration-500 shadow-xl hover:shadow-amber-500/10"
  >
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner">
      {icon}
    </div>
    <h3 className="text-2xl font-heading font-black tracking-tight mb-4 text-slate-900 dark:text-white uppercase italic">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
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
    <div ref={containerRef} className="min-h-screen bg-[#FFFDF0] dark:bg-slate-950 selection:bg-amber-100 overflow-x-hidden">
      {/* Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] h-24 flex items-center">
        <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl border-b border-white/10" />
        <div className="container mx-auto px-6 flex items-center justify-between relative z-10">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="p-2.5 rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/20 group-hover:rotate-12 transition-transform duration-500">
              <Milk className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-2xl tracking-tighter text-slate-900 dark:text-white italic uppercase leading-none">DairyDays</span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-amber-600 uppercase mt-1">Heritage Quality</span>
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
              <Button asChild className="h-12 px-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-amber-500 hover:text-white transition-all duration-500 font-bold italic shadow-xl shadow-black/5">
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
              src="/images/farm_landscape.png" 
              alt="Premium Dairy Farm" 
              fill 
              priority
              className="object-cover scale-110 brightness-[0.85] dark:brightness-[0.6]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FFFDF0] dark:to-slate-950" />
          </motion.div>

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
              <h1 className="text-7xl md:text-[10rem] font-heading font-black text-white italic leading-[0.8] mb-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {tHero('title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">{tHero('titleHighlight')}</span>
              </h1>
              <p className="max-w-2xl mx-auto text-white/80 text-lg md:text-2xl font-medium tracking-wide mb-16 drop-shadow-lg">
                {tHero('subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <Button asChild size="lg" className="h-20 px-12 rounded-3xl bg-amber-500 hover:bg-white hover:text-amber-600 text-white text-2xl font-heading font-black italic shadow-2xl shadow-amber-500/40 transition-all duration-700 group relative overflow-hidden">
                  <Link href="/login" className="flex items-center gap-4 relative z-10">
                    {tHero('initialize')} <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform duration-500" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-20 px-12 rounded-3xl border-2 border-white/30 text-white hover:bg-white hover:text-slate-900 text-2xl font-heading font-black italic backdrop-blur-xl transition-all duration-700">
                  <Link href="#collection">{tHero('status')}</Link>
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
                <Image src="/images/milk_pouring.png" alt="Pure Milk Pouring" fill className="object-cover group-hover:scale-110 transition-transform duration-[3s]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                   <span className="text-amber-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 block">{tFeatures('core')}</span>
                   <h3 className="text-4xl font-heading font-black text-white uppercase italic leading-tight">{tFeatures('realtimeTitle')}</h3>
                </div>
              </motion.div>
              
              <div>
                <span className="text-amber-600 text-sm font-black tracking-[0.4em] uppercase mb-6 block">{tFeatures('core')}</span>
                <h2 className="text-5xl md:text-7xl font-heading font-black text-slate-900 dark:text-white uppercase italic leading-[0.9] mb-12">
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
                      <div className="flex-shrink-0 w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-center text-amber-600 shadow-xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xl font-heading font-black text-slate-900 dark:text-white uppercase italic mb-2 tracking-tight">{item.title}</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-40 bg-slate-50 dark:bg-slate-900/40 relative">
          <div className="container px-6 mx-auto text-center mb-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-6xl md:text-8xl font-heading font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-8">
                {tFeatures('titleHighlight')}
              </h2>
              <div className="w-24 h-1.5 bg-amber-500 mx-auto rounded-full" />
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
          <Image src="/images/products_showcase.png" alt="Premium Products" fill className="object-cover brightness-[0.7]" />
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
               <Button asChild size="lg" className="h-20 px-12 rounded-[2rem] bg-white text-slate-900 hover:bg-amber-500 hover:text-white text-2xl font-heading font-black italic shadow-2xl transition-all duration-700">
                  <Link href="/login">Secure Your Daily Supply</Link>
               </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="pt-40 pb-20 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-20 mb-32">
            <div className="max-w-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-2 rounded-xl bg-amber-500">
                  <Milk className="h-6 w-6 text-white" />
                </div>
                <span className="font-heading font-black text-3xl tracking-tighter italic uppercase">DairyDays</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                Pioneering the modern dairy experience. We combine 40 years of heritage with state-of-the-art logistics.
              </p>
              <div className="flex gap-4">
                 {[1,2,3,4].map(idx => (
                   <div key={idx} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-500 transition-colors" />
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
                        <Link href="#" className="font-bold text-sm text-slate-600 dark:text-slate-400 hover:text-amber-600 transition-colors uppercase italic tracking-tight">{link}</Link>
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
